// POST /api/comment —— 流式 AI 营养点评（SSE）
// 链路：RAG 检索膳食指南 → GLM-4 流式生成；无 Key：mock 文案兜底
import type { FoodItem } from '~/types/diet'
import { sumNutrition } from '~/types/diet'
import { initSSE, pipeOpenAIStream } from '../utils/sse'
import { retrieve } from '../utils/rag'
import { hasTextKey, llmChatStream } from '../utils/zhipu'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ foods: FoodItem[] }>(event)
  const foods: FoodItem[] = body?.foods ?? []
  const totals = foods.length ? sumNutrition(foods) : null
  const kcal = Math.round(totals?.kcal ?? 0)
  const sse = initSSE(event)
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const MOCK_TEXT =
    `这一餐估算摄入约 ${kcal} 千卡。` +
    `从搭配来看，你做到了荤素结合，蛋白质和膳食纤维都有覆盖，整体结构不错。` +
    `如果目标是控制热量，建议主食减到一拳大小，并优先选择清蒸、快炒的烹饪方式；` +
    `下一餐可以补充一些乳制品或豆制品，让钙和优质蛋白更充足。` +
    `温馨提示：以上为营养参考建议，不构成医疗诊断。`

  // 无 Key：mock 流式
  if (!hasTextKey()) {
    sse.write({ type: 'stage', label: '已检索《中国居民膳食指南》相关条目（mock）' })
    await sleep(400)
    for (const ch of MOCK_TEXT) {
      sse.write({ type: 'text', text: ch })
      await sleep(26)
    }
    sse.write({ type: 'done' })
    return sse.end()
  }

  // RAG：先检索再生成
  const query = `一餐包含${foods.map((f) => `${f.name}${f.region ? `（${f.region}）` : ''}`).join('、') || '未知食物'}，总热量约${kcal}千卡，蛋白质${(totals?.protein ?? 0).toFixed(1)}g，给出营养点评与改善建议`
  let passages: string[] = []
  try {
    passages = await retrieve(query, 4)
  } catch (e: any) {
    console.error('[comment] RAG 检索失败：', e?.message)
  }
  sse.write({
    type: 'stage',
    label: passages.length ? `已检索《膳食指南/食物成分表》相关条目 ${passages.length} 条` : '知识库检索为空，直接点评'
  })

  const system = `你是专业且亲和的营养分析师。请基于【检索资料】对用户这一餐做简短点评（120字以内，2-3句）：
1. 先总评热量与营养结构（引用检索到的具体数据增强可信度）
2. 给出一条最重要的改善建议
风格：口语化、鼓励为主。结尾固定加一句"以上为营养参考建议，不构成医疗诊断。"
【检索资料】
${passages.map((p, i) => `${i + 1}. ${p}`).join('\n') || '（无）'}`

  try {
    const upstream = await llmChatStream([
      { role: 'system', content: system },
      {
        role: 'user',
        content: `我这一餐吃了：${foods.map((f) => `${f.name}${f.region ? `（${f.region}）` : ''}约${f.grams}g`).join('、') || '（未提供）'}，估算总热量${kcal}千卡。请点评。`
      }
    ])
    if (!upstream.ok) throw new Error(`上游 ${upstream.status}`)
    await pipeOpenAIStream(upstream, (e) => sse.write(e))
    sse.write({ type: 'done' })
    return sse.end()
  } catch (err: any) {
    console.error('[comment] GLM-4 调用失败，降级 mock：', err?.message)
    for (const ch of MOCK_TEXT) {
      sse.write({ type: 'text', text: ch })
      await sleep(20)
    }
    sse.write({ type: 'done' })
    return sse.end()
  }
})
