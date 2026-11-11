// POST /api/report —— AI 周报总结（SSE 流式）
// 输入：前端汇总的 7 天真实记录（每日热量 + 菜名）、营养目标、口味画像
// 有 Key → GLM-4-Flash 真流式生成个性化周报；无 Key/失败 → 基于真实统计的规则文案
import { defineEventHandler, readBody } from 'h3'
import { hasTextKey, llmChatStream } from '../utils/zhipu'

interface ReportDay {
  label: string
  kcal: number | null
  meals: string[]
}

interface ReportBody {
  nickname?: string
  populationLabel?: string
  goal?: string
  dailyGoals?: { kcal: number; protein: number; fat: number; carb: number }
  days?: ReportDay[]
  avgKcal?: number
  goalRate?: number
  taste?: string[]
  tasteRegions?: string[]
  topDishes?: string[]
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  const write = (obj: unknown) => event.node.res.write(`data: ${JSON.stringify(obj)}\n\n`)

  const body = (await readBody(event).catch(() => ({}))) as ReportBody
  const days = Array.isArray(body.days) ? body.days : []
  const goals = body.dailyGoals
  const avg = Math.round(body.avgKcal ?? 0)
  const recorded = days.filter((d) => d.kcal != null)
  const diff = goals ? Math.round(((avg - goals.kcal) / goals.kcal) * 100) : 0

  /** 无 AI 时的降级文案：完全基于真实统计 */
  const fallback = () => {
    if (!recorded.length) {
      return '本周还没有饮食记录。去「饮食记录」页拍照识餐或手动记录几餐后，这里会生成基于真实数据的营养周报。（本报告仅供参考，不构成医疗建议。）'
    }
    const trend = diff <= -5 ? `平均每日约 ${avg} 千卡，低于目标 ${Math.abs(diff)}%，呈温和热量缺口` : diff >= 5 ? `平均每日约 ${avg} 千卡，超出目标 ${diff}%，建议适当控制主食与油量` : `平均每日约 ${avg} 千卡，与目标基本持平，热量控制得不错`
    const dishLine = body.topDishes?.length ? `本周常吃：${body.topDishes.slice(0, 5).join('、')}。` : ''
    const tasteLine = [
      body.taste?.length ? `口味画像显示你偏好${body.taste.slice(0, 3).join('、')}` : '',
      body.tasteRegions?.length ? `常吃地域/风味为${body.tasteRegions.slice(0, 3).join('、')}` : ''
    ].filter(Boolean).join('，')
    const goalLine = goals ? `按目标（${goals.kcal} kcal/日）与「${body.goal === 'lose' ? '减脂' : body.goal === 'gain' ? '增肌' : '保持'}」方向，${recorded.length >= 3 ? '继续保持记录习惯，推荐页的餐单会随画像持续个性化' : '多记录几餐可以让 AI 推荐更精准'}。` : ''
    return `本周共记录 ${recorded.length} 天饮食，${trend}。${dishLine}${tasteLine}${goalLine}下周建议：① 主食粗细搭配，一半替换为全谷物；② 保证每日蛋白质与蔬菜摄入；③ 晚餐清淡少油。（本报告由 AI 基于你的记录生成，仅供参考，不构成医疗建议。）`
  }

  if (!hasTextKey()) {
    const text = fallback()
    for (const ch of text) {
      write({ type: 'text', text: ch })
      await new Promise((r) => setTimeout(r, 18))
    }
    write({ type: 'done' })
    event.node.res.write('data: [DONE]\n\n')
    event.node.res.end()
    return
  }

  try {
    const daysText = days
      .map((d) => `${d.label}：${d.kcal != null ? `${d.kcal} kcal` : '未记录'}${d.meals.length ? `，吃了 ${d.meals.join('、')}` : ''}`)
      .join('\n') || '本周无记录'

    const res = await llmChatStream([
      {
        role: 'system',
        content: `你是专业营养师，为用户撰写一周营养周报。要求：① 只基于给定真实数据，严禁虚构数字或没吃的菜；② 结合用户人群（${body.populationLabel ?? '普通成人'}）与目标（${body.goal ?? '保持'}）给出下周 2-3 条可操作建议；③ 200 字以内，语气亲切自然；④ 结尾加一句「仅供参考，不构成医疗建议」。直接输出正文，不要标题。`
      },
      {
        role: 'user',
        content: `用户：${body.nickname || '用户'}（${body.populationLabel ?? '普通成人'}，目标：${body.goal ?? '保持'}）
每日热量目标：${goals ? `${goals.kcal} kcal（蛋白质 ${goals.protein}g / 脂肪 ${goals.fat}g / 碳水 ${goals.carb}g）` : '未设置'}
本周记录：
${daysText}
统计：有记录 ${recorded.length} 天，日均 ${avg || '—'} kcal（相对目标 ${diff >= 0 ? '+' : ''}${diff}%），目标达成率 ${body.goalRate ?? 0}%
${body.topDishes?.length ? `本周常吃菜品：${body.topDishes.join('、')}` : ''}
${body.taste?.length || body.tasteRegions?.length ? `口味画像：${body.taste?.length ? `偏好${body.taste.join('、')}` : ''}${body.tasteRegions?.length ? `；常吃地域/风味${body.tasteRegions.join('、')}` : ''}` : '口味画像暂无数据'}`
      }
    ])

    if (!res.ok || !res.body) throw new Error(`上游 ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content
          if (delta) write({ type: 'text', text: delta })
        } catch {
          /* 忽略解析失败片段 */
        }
      }
    }
    write({ type: 'done' })
    event.node.res.write('data: [DONE]\n\n')
    event.node.res.end()
  } catch (err: any) {
    console.error('[report] GLM 流式失败，降级规则文案:', err?.message)
    const text = fallback()
    for (const ch of text) {
      write({ type: 'text', text: ch })
      await new Promise((r) => setTimeout(r, 18))
    }
    write({ type: 'done' })
    event.node.res.write('data: [DONE]\n\n')
    event.node.res.end()
  }
})
