// POST /api/vision —— 识餐接口
// 骨架阶段返回 mock；正式版：GLM-4V 多模态识别，JSON Schema 约束输出
// 参考实现要点：
//   const res = await $fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
//     body: { model: 'glm-4v-flash', messages: [...], response_format: { type: 'json_object' } }
//   })
import { mockRecognize } from '../utils/foodDb'

export default defineEventHandler(async () => {
  // 模拟识别耗时
  await new Promise((r) => setTimeout(r, 600))
  return {
    ok: true,
    source: 'mock', // 接入真实模型后变为 'glm-4v'
    foods: mockRecognize()
  }
})
