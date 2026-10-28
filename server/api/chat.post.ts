// POST /api/chat —— AI 营养师 Agent 对话（SSE）
// 骨架阶段 mock 工具调用 + 流式回复；正式版：GLM-4 Function Calling
// 工具集规划：queryNutrition(查营养库) / getTodayIntake(查今日摄入) / createMealPlan(生成食谱)
export default defineEventHandler(async (event) => {
  await readBody(event)

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  const write = (obj: unknown) => event.node.res.write(`data: ${JSON.stringify(obj)}\n\n`)

  // 模拟 Agent 工具调用过程（可解释 Agent：让用户看到“查证”过程）
  write({ type: 'tool', label: '查询今日饮食记录' })
  await sleep(500)
  write({ type: 'tool', label: '检索《膳食指南》建议条目' })
  await sleep(500)

  const text =
    '我看了你今天的记录：目前蛋白质摄入还有约 25g 的空间，碳水略偏低。' +
    '晚餐建议安排一份鸡胸肉或鱼虾类补充优质蛋白，搭配一份绿叶菜和一拳主食。' +
    '如果想让我直接生成一份一周食谱计划，回复「帮我排食谱」就可以。' +
    '（以上为营养参考建议，不构成医疗诊断。）'

  for (const ch of text) {
    write({ type: 'text', text: ch })
    await new Promise((r) => setTimeout(r, 24))
  }
  write({ type: 'done' })
  event.node.res.write('data: [DONE]\n\n')
  event.node.res.end()
})
