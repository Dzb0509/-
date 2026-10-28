// POST /api/report —— 周报 AI 总结（SSE）
// 骨架阶段 mock；正式版：汇总 7 天记录 + RAG 检索膳食指南 → GLM-4 流式生成
export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  const write = (obj: unknown) => event.node.res.write(`data: ${JSON.stringify(obj)}\n\n`)

  const text =
    '本周共记录 5 餐，平均每日摄入约 1680 千卡，低于目标约 7%，整体呈现温和热量缺口，适合减脂节奏。' +
    '蛋白质平均达标率 86%，表现不错；脂肪摄入周三、周六两天偏高，主要来自油炸和红烧类菜品；' +
    '蔬菜摄入频率较高，值得保持。下周建议：① 午餐主食用粗粮替换一半精米面；② 控制两次外卖频次；③ 蛋白质早餐再加一份乳制品。' +
    '（本报告由 AI 基于你的记录生成，仅供参考。）'

  for (const ch of text) {
    write({ type: 'text', text: ch })
    await new Promise((r) => setTimeout(r, 20))
  }
  write({ type: 'done' })
  event.node.res.write('data: [DONE]\n\n')
  event.node.res.end()
})
