// POST /api/comment —— 流式 AI 营养点评（SSE）
// 骨架阶段回放固定文案；正式版：RAG 检索膳食指南 → GLM-4 流式生成
import type { FoodItem } from '~/types/diet'
import { sumNutrition } from '~/types/diet'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ foods: FoodItem[] }>(event)
  const totals = body?.foods?.length ? sumNutrition(body.foods) : null
  const kcal = Math.round(totals?.kcal ?? 0)

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  const write = (obj: unknown) => event.node.res.write(`data: ${JSON.stringify(obj)}\n\n`)

  // 模拟 Agent 阶段：检索知识库 → 生成点评
  write({ type: 'stage', label: '已检索《中国居民膳食指南》相关条目' })
  await sleep(400)

  const text =
    `这一餐估算摄入约 ${kcal} 千卡。` +
    `从搭配来看，你做到了荤素结合，蛋白质和膳食纤维都有覆盖，整体结构不错。` +
    `如果目标是控制热量，建议主食减到一拳大小，并优先选择清蒸、快炒的烹饪方式；` +
    `下一餐可以补充一些乳制品或豆制品，让钙和优质蛋白更充足。` +
    `温馨提示：以上为营养参考建议，不构成医疗诊断。`

  // 逐字流式输出
  for (const ch of text) {
    write({ type: 'text', text: ch })
    await sleep(28)
  }
  write({ type: 'done' })
  event.node.res.write('data: [DONE]\n\n')
  event.node.res.end()
})

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
