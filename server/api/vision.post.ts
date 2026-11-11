// POST /api/vision —— 识餐接口
// 识别失败返回错误，禁止以示例结果污染饮食记录。
import { createError, defineEventHandler, readBody } from 'h3'
import { createHash } from 'node:crypto'
import { hasVisionKey, visionConfig } from '../utils/zhipu'
import { FOOD_DB } from '../utils/foodDb'
import type { FoodItem } from '~/types/diet'

const visionCache = new Map<string, { ok: true; source: string; foods: FoodItem[] }>()
const VISION_CACHE_LIMIT = 100

function buildVisionPrompt(regionHint?: string) { return `你是全球食物识别与营养分析助手。请识别图片中实际可见的食物，不要根据常见餐桌搭配臆测未看见的食物。
${regionHint?.trim() ? `用户补充的地域/风味线索是「${regionHint.trim().slice(0, 80)}」，仅作参考，不要把它当成硬性菜系范围；烧烤、火锅、小吃、街头摊、融合菜等都可以直接作为菜品类型或风味标签。` : '不要强行套用固定菜系分类，优先描述画面中实际可见的菜品和风味。'}
对每个菜品：
1. 给出名称、地域/风味/菜品类型标签（可写西餐、意大利菜、法餐、日料、韩餐、东南亚、墨西哥菜、甜点、饮品、烧烤、融合菜等自由标签）、估计份量（克）、识别置信度(0-1，两位小数)
2. 估计该菜品每100克的营养成分（热量kcal、蛋白质g、脂肪g、碳水g）；看不清时降低置信度，不要编造精确值
只输出 JSON，格式：
{"foods":[{"name":"菜名","region":"地域或风味标签","grams":150,"confidence":0.9,"per100":{"kcal":120,"protein":5,"fat":3,"carb":15}}]}
不要输出任何其他文字。` }

/**
 * 从模型输出中提取第一个完整 JSON 值（括号配对扫描，支持对象/数组，容错尾部杂质）
 */
function extractJson(text: string): any {
  const s = text.search(/[{[]/)
  if (s === -1) throw new Error('未找到 JSON')
  const open = text[s]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = s; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return JSON.parse(text.slice(s, i + 1))
    }
  }
  throw new Error('JSON 不完整')
}

async function callVision(base: string, key: string, model: string, image: string, prompt: string, timeout = 60000) {
  const res = await $fetch<any>(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: { model, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: prompt }] }], temperature: 0.15 },
    timeout
  })
  const parsed = extractJson(res.choices?.[0]?.message?.content ?? '')
  const list = Array.isArray(parsed) ? parsed : (parsed.foods ?? (parsed.name ? [parsed] : []))
  return Array.isArray(list) ? list : []
}


export default defineEventHandler(async (event): Promise<{ ok: boolean; source: string; foods: FoodItem[] }> => {
  const body = await readBody<{ image?: string; regionHint?: string }>(event)

  if (typeof body?.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image) || body.image.length > 8_000_000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image' })
  }
  if (!hasVisionKey()) throw createError({ statusCode: 503, statusMessage: 'Vision service unavailable' })

  const cacheKey = createHash('sha256').update(`${body.regionHint ?? ''}\n${body.image}`).digest('hex')
  const cached = visionCache.get(cacheKey)
  if (cached) return { ...cached, foods: cached.foods.map((food) => ({ ...food, per100: { ...food.per100 } })) }

  const { base, key, model } = visionConfig()
  try {
    const list: any[] = await callVision(base, key, model, body.image, buildVisionPrompt(body.regionHint))
    if (!Array.isArray(list) || list.length > 50) throw new Error('识别格式无效')
    const foods: FoodItem[] = list.map((f: any, i: number) => {
      if (!f || typeof f.name !== 'string' || !f.name.trim() || !Number.isFinite(f.grams) || f.grams <= 0 || !f.per100 || !['kcal', 'protein', 'fat', 'carb'].every(k => Number.isFinite(f.per100[k]) && f.per100[k] >= 0)) throw new Error('识别营养数据无效')
      const name = String(f.name ?? '未知食物').trim()
      const db = FOOD_DB.find((entry) => entry.name === name)
      return {
      id: `f-${Date.now()}-${i}`,
      name,
      region: String(f.region ?? f.cuisine ?? '未标注').trim().slice(0, 20) || '未标注',
      grams: Math.max(5, Math.min(2000, Math.round(Number(f.grams) || 100))),
      confidence: Number.isFinite(Number(f.confidence))
        ? Math.max(0, Math.min(1, Number(f.confidence)))
        : 0.7,
      per100: db?.per100 ?? {
        kcal: Number(f.per100?.kcal) || 0,
        protein: Number(f.per100?.protein) || 0,
        fat: Number(f.per100?.fat) || 0,
        carb: Number(f.per100?.carb) || 0
      }
      }
    })
    if (!foods.length) throw new Error('识别结果为空')
    const result = { ok: true as const, source: 'glm-4v', foods }
    visionCache.set(cacheKey, result)
    if (visionCache.size > VISION_CACHE_LIMIT) {
      const oldest = visionCache.keys().next().value
      if (oldest) visionCache.delete(oldest)
    }
    return result
  } catch (err: any) {
    console.error('[vision] 识别失败：', err?.message)
    throw createError({ statusCode: 502, statusMessage: 'Food recognition failed' })
  }
})
