// POST /api/chat —— AI 营养师 Agent 对话（SSE）
// 有 Key：GLM-4 Function Calling（工具调用过程实时推送前端）；无 Key：mock 兜底
// 工具集：queryNutrition(查营养库) / getTodayIntake(查今日摄入) / createMealPlan(生成食谱)
import { FOOD_DB } from '../utils/foodDb'
import { initSSE, pipeOpenAIStream } from '../utils/sse'
import { retrieve } from '../utils/rag'
import { hasTextKey, llmChat, llmChatStream } from '../utils/zhipu'

interface ClientMessage {
  role: 'user' | 'assistant'
  text: string
}
interface ChatContext {
  today?: { totals: { kcal: number; protein: number; fat: number; carb: number }; goals: { kcal: number; protein: number; fat: number; carb: number } }
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'queryNutrition',
      description: '查询某种食物每100克的营养成分（热量/蛋白质/脂肪/碳水）',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: '食物名称，如：鸡胸肉' } },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTodayIntake',
      description: '获取用户今日已摄入的营养总量与每日营养目标',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createMealPlan',
      description: '为用户生成一日或多日的食谱计划，需说明天数与目标（减脂/保持/增肌）',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: '天数，1-7' },
          goal: { type: 'string', description: '目标：lose/keep/gain' }
        },
        required: ['days', 'goal']
      }
    }
  }
]

const GOAL_LABELS: Record<string, string> = { lose: '减脂', keep: '保持体重', gain: '增肌' }

function execTool(name: string, args: any, ctx: ChatContext): string {
  switch (name) {
    case 'queryNutrition': {
      const q = String(args.name ?? '')
      const hits = FOOD_DB.filter((f) => f.name.includes(q) || q.includes(f.name))
      return hits.length
        ? JSON.stringify(hits.map((h) => ({ name: h.name, per100: h.per100 })))
        : JSON.stringify({ found: false, hint: `内置营养库未收录「${q}」，请基于常识估算并说明为估计值` })
    }
    case 'getTodayIntake':
      return JSON.stringify(ctx.today ?? { hint: '用户今日暂无记录' })
    case 'createMealPlan':
      return JSON.stringify({
        instruction: `请基于膳食指南与用户目标（${GOAL_LABELS[String(args.goal)] ?? args.goal}）直接生成${args.days ?? 1}日食谱，早午晚三餐+加餐，标注每餐热量估算。`
      })
    default:
      return JSON.stringify({ error: `未知工具 ${name}` })
  }
}

const SYSTEM_BASE = `你是「食刻 AI」的 AI 营养师，专业、亲和、简洁（每次回复不超过180字，除非用户要求食谱）。
回答营养问题时优先使用工具查证，不要编造具体数值。涉及疾病相关饮食问题必须建议咨询医生。
结尾自然地附上"以上为营养参考建议，不构成医疗诊断。"`

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages: ClientMessage[]; context?: ChatContext }>(event)
  const history: ClientMessage[] = body?.messages ?? []
  const ctx: ChatContext = body?.context ?? {}
  const sse = initSSE(event)
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.text ?? ''

  // 无 Key：mock 兜底
  if (!hasTextKey()) {
    sse.write({ type: 'tool', label: '查询今日饮食记录（mock）' })
    await sleep(500)
    sse.write({ type: 'tool', label: '检索《膳食指南》建议条目（mock）' })
    await sleep(500)
    const text =
      '我看了你今天的记录：目前蛋白质摄入还有约 25g 的空间，碳水略偏低。' +
      '晚餐建议安排一份鸡胸肉或鱼虾类补充优质蛋白，搭配一份绿叶菜和一拳主食。' +
      '如果想让我直接生成一份一周食谱计划，回复「帮我排食谱」就可以。' +
      '（以上为营养参考建议，不构成医疗诊断。）'
    for (const ch of text) {
      sse.write({ type: 'text', text: ch })
      await sleep(24)
    }
    sse.write({ type: 'done' })
    return sse.end()
  }

  // RAG：按最近一条用户消息检索背景知识
  let passages: string[] = []
  try {
    passages = await retrieve(lastUser, 3)
  } catch (e: any) {
    console.error('[chat] RAG 检索失败：', e?.message)
  }

  const messages: any[] = [
    {
      role: 'system',
      content:
        SYSTEM_BASE +
        (passages.length ? `\n【营养知识参考】\n${passages.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : '') +
        (ctx.today ? `\n【今日摄入】已摄入${Math.round(ctx.today.totals.kcal)}kcal（目标${ctx.today.goals.kcal}kcal），蛋白质${ctx.today.totals.protein.toFixed(1)}/${ctx.today.goals.protein}g` : '')
    },
    ...history.map((m) => ({ role: m.role, content: m.text }))
  ]

  try {
    // Agent 循环：最多 2 轮工具调用，结束后流式生成最终回答
    for (let round = 0; round < 2; round++) {
      const res = await llmChat(messages, TOOLS)
      const choice = res.choices?.[0]?.message
      const toolCalls = choice?.tool_calls ?? []

      if (!toolCalls.length) {
        // 无工具调用：直接把已完成内容流式输出
        const content: string = choice?.content ?? ''
        for (const ch of content) {
          sse.write({ type: 'text', text: ch })
          await sleep(16)
        }
        sse.write({ type: 'done' })
        return sse.end()
      }

      // assistant 工具调用消息只推一次
      messages.push({ role: 'assistant', content: choice?.content ?? '', tool_calls: toolCalls })

      // 逐个执行工具并推送调用过程（可解释 Agent）
      for (const tc of toolCalls) {
        let args: any = {}
        try {
          args = JSON.parse(tc.function?.arguments ?? '{}')
        } catch {}
        sse.write({ type: 'tool', label: describeTool(tc.function?.name, args) })
        const result = execTool(tc.function?.name, args, ctx)
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }
    }

    // 工具轮次用尽：流式生成最终回答
    const finalRes = await llmChatStream(messages)
    if (!finalRes.ok) throw new Error(`上游 ${finalRes.status}`)
    await pipeOpenAIStream(finalRes, (e) => sse.write(e))
    sse.write({ type: 'done' })
    return sse.end()
  } catch (err: any) {
    console.error('[chat] Agent 调用失败，降级 mock：', err?.message)
    const text = '抱歉，AI 服务暂时不可用，请稍后再试。（以上为营养参考建议，不构成医疗诊断。）'
    for (const ch of text) sse.write({ type: 'text', text: ch })
    sse.write({ type: 'done' })
    return sse.end()
  }
})

function describeTool(name?: string, args?: any): string {
  switch (name) {
    case 'queryNutrition':
      return `查询「${args?.name ?? '食物'}」营养成分`
    case 'getTodayIntake':
      return '查询今日饮食记录'
    case 'createMealPlan':
      return `生成${args?.days ?? 1}日${GOAL_LABELS[String(args?.goal)] ?? ''}食谱`
    default:
      return '调用工具'
  }
}
