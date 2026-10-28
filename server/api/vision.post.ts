// POST /api/vision —— 识餐接口
// 有 Key：GLM-4V 多模态识别（Prompt 约束 JSON 输出）；无 Key：mock 兜底
import { mockRecognize } from '../utils/foodDb'
import { hasKey, visionModel } from '../utils/zhipu'
import type { FoodItem } from '~/types/diet'

const VISION_PROMPT = `你是营养分析师助手。请识别图片中的食物，对每个菜品：
1. 给出名称、估计份量（克）、识别置信度(0-1，两位小数)
2. 估计该菜品每100克的营养成分（热量kcal、蛋白质g、脂肪g、碳水g）
只输出 JSON，格式：
{"foods":[{"name":"菜名","grams":150,"confidence":0.9,"per100":{"kcal":120,"protein":5,"fat":3,"carb":15}}]}
不要输出任何其他文字。`

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('未找到 JSON')
  return JSON.parse(raw.slice(start, end + 1))
}

export default defineEventHandler(async (event): Promise<{ ok: boolean; source: string; foods: FoodItem[] }> => {
  const body = await readBody<{ image?: string }>(event)

  // 无 Key：mock 兜底，保证演示可用
  if (!hasKey() || !body?.image) {
    await new Promise((r) => setTimeout(r, 600))
    return { ok: true, source: 'mock', foods: mockRecognize() }
  }

  try {
    const res = await $fetch<any>('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
      body: {
        model: visionModel(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: body.image } },
              { type: 'text', text: VISION_PROMPT }
            ]
          }
        ],
        temperature: 0.2
      },
      timeout: 60000
    })
    const text: string = res.choices?.[0]?.message?.content ?? ''
    const parsed = extractJson(text)
    const foods: FoodItem[] = (parsed.foods ?? []).map((f: any, i: number) => ({
      id: `f-${Date.now()}-${i}`,
      name: String(f.name ?? '未知食物'),
      grams: Math.max(5, Math.min(2000, Math.round(Number(f.grams) || 100))),
      confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.7)),
      per100: {
        kcal: Number(f.per100?.kcal) || 0,
        protein: Number(f.per100?.protein) || 0,
        fat: Number(f.per100?.fat) || 0,
        carb: Number(f.per100?.carb) || 0
      }
    }))
    if (!foods.length) throw new Error('识别结果为空')
    return { ok: true, source: 'glm-4v', foods }
  } catch (err: any) {
    console.error('[vision] GLM-4V 调用失败，降级 mock：', err?.message)
    return { ok: true, source: 'mock_fallback', foods: mockRecognize() }
  }
})
