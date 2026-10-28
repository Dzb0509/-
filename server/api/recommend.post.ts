import { defineEventHandler, readBody } from 'h3'
import { DISHES, filterDishes } from '../utils/dishes'
import { hasTextKey, llmChat } from '../utils/zhipu'
import { retrieve } from '../utils/rag'
import type { Dish, FamilyMember, PopulationId, RecommendResult } from '~/types/recommend'
import type { TasteProfile } from '~/types/taste'
import { topEntries } from '~/types/taste'

type MealKey = 'breakfast' | 'lunch' | 'dinner'
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

const POP_LABELS: Record<string, string> = {
  balance: '均衡饮食', lose: '减脂控卡', muscle: '增肌塑形', sugar: '控糖稳糖',
  child: '儿童青少年', pregnant: '孕产期', elderly: '老年人'
}

interface Body {
  population?: PopulationId
  /** 家庭模式：传入成员列表时按「全家交集需求」综合推荐 */
  members?: FamilyMember[]
  meals?: MealKey[]
  day?: 'today' | 'tomorrow'
  yesterday?: string[]
  taste?: TasteProfile
  seed?: number
}

/** 家庭模式候选：一道菜须覆盖全部成员人群；覆盖不足半数成员的菜剔除 */
function familyCandidates(meal: MealKey, members: FamilyMember[]): Dish[] {
  const pops = [...new Set(members.map((m) => m.population))]
  const pool = DISHES.filter((d) => {
    if (meal === 'breakfast') return !['d101','d102','d103','d104','d201','d202','d203','d204','d301','d302','d401','d402','d501','d502','d503','d601','d602','d701','d702','d801','d802','d901','d902'].includes(d.id)
    return !['d001', 'd002', 'd003', 'd004', 'd005', 'd1101', 'd1102'].includes(d.id)
  })
  const full = pool.filter((d) => pops.every((p) => d.pops.includes(p as never)))
  if (full.length >= 6) return full
  const majority = pool.filter((d) => {
    const cover = pops.filter((p) => d.pops.includes(p as never)).length
    return cover >= Math.ceil(pops.length / 2)
  })
  return majority.length >= 6 ? majority : pool
}

/** 规则引擎：按口味/地域画像与昨日重复度打分 */
function rulePick(meal: MealKey, body: Body, exclude: Set<string>): Dish[] {
  const pool = (body.members?.length ? familyCandidates(meal, body.members) : filterDishes(body.population ?? 'balance', meal))
    .filter((d) => !exclude.has(d.id))
  const scored = pool.map((d) => {
    let s = Math.random() * 0.8 // 轻微随机，保证「换一换」有变化
    const flavors = body.taste?.flavors ?? {}
    for (const f of d.flavors) s += (flavors[f as keyof typeof flavors] ?? 0) * 1.5
    const regions = body.taste?.regions ?? {}
    s += (regions[d.region] ?? 0) * 1.2
    // 昨天吃过的菜名降权
    if (body.yesterday?.some((y) => y.includes(d.name) || d.name.includes(y))) s -= 5
    return { d, s }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, 2).map((x) => x.d)
}

export default defineEventHandler(async (handler): Promise<RecommendResult> => {
  const body = (await readBody(handler)) as Body
  const pop = body.population ?? 'balance'
  const meals = body.meals?.length ? body.meals : MEAL_KEYS
  const exclude = new Set<string>()
  const isFamily = !!body.members?.length

  const userLabel = isFamily
    ? `一个 ${body.members!.length} 口之家：${body.members!.map((m) => `${m.label || '成员'}（${m.age}岁，${POP_LABELS[m.population] ?? m.population}）`).join('、')}`
    : `${POP_LABELS[pop] ?? pop}人群`
  const tasteText = [
    topEntries(body.taste?.flavors as unknown as Record<string, number> ?? {}, 3).join('、'),
    topEntries(body.taste?.regions ?? {}, 2).join('、')
  ].filter(Boolean)

  // ---- 真实链路：规则引擎出候选 → GLM-4 择优 + 生成推荐理由 ----
  if (hasTextKey()) {
    try {
      const candidates: Record<string, { id: string; name: string; region: string; flavors: string[]; kcal: number; highlight: string }[]> = {}
      const ruleResult: RecommendResult = { source: 'glm', reason: '', meals: {} }
      for (const meal of meals) {
        const picks = rulePick(meal, body, exclude)
        picks.forEach((p) => exclude.add(p.id))
        ruleResult.meals[meal] = picks
        const pool = isFamily ? familyCandidates(meal, body.members!) : filterDishes(pop, meal)
        candidates[meal] = pool
          .filter((d) => !body.yesterday?.some((y) => y.includes(d.name)))
          .slice(0, 12)
          .map(({ id, name, region, flavors, nutrition, highlight }) => ({
            id, name, region, flavors, kcal: nutrition.kcal, highlight
          }))
      }

      const guide = await retrieve(
        `${userLabel}三餐搭配原则` + (tasteText.length ? `，偏好${tasteText.join('/')}` : ''),
        2
      ).catch(() => [] as string[])

      const sys = `你是营养师。${isFamily ? '这是家庭模式：一道菜要尽量同时满足所有成员的营养需求（例如有孕妇就保证叶酸与优质蛋白、有老人就软烂低盐、有孩子就营养密度高且不太辣），并兼顾大人的口味。' : '根据用户画像挑选合适的菜。'}从候选菜中为每餐挑选 2 道最合适的菜（贴合口味偏好、避免与昨天吃的重复），并用不超过 60 字给出整体推荐理由（须结合${isFamily ? '成员构成' : '用户口味/昨日饮食'}说「为什么这样搭配」）。
严格输出 JSON：{"reason":"...","meals":{"breakfast":["d001"],"lunch":["d101"],"dinner":["d201"]}}（仅含要求的餐次，每餐恰好 2 个菜品 id，必须来自候选列表）`
      const user = `${isFamily ? '家庭构成' : '用户'}：${userLabel}${tasteText.length ? `，口味偏好：${tasteText.join('、')}` : '（暂无口味数据）'}
昨日饮食：${body.yesterday?.length ? body.yesterday.join('、') : '无记录'}
膳食指南参考：${guide.join('；') || '三餐能量比 3:4:3，主食粗细搭配，每餐有蛋白质与蔬菜'}
候选菜（按餐次）：${JSON.stringify(candidates)}`

      const res = await llmChat([
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ])
      const text: string = res.choices?.[0]?.message?.content ?? ''
      const m = text.match(/\{[\s\S]*\}/)
      if (m) {
        const parsed = JSON.parse(m[0])
        const out: RecommendResult = { source: 'glm', reason: String(parsed.reason ?? '').slice(0, 120), meals: {} }
        for (const meal of meals) {
          const ids: string[] = Array.isArray(parsed.meals?.[meal]) ? parsed.meals[meal] : []
          const dishes = ids
            .map((id) => DISHES.find((d) => d.id === id))
            .filter(Boolean) as Dish[]
          out.meals[meal] = dishes.length ? dishes : (ruleResult.meals[meal] ?? [])
        }
        return out
      }
      throw new Error('解析失败')
    } catch (err: any) {
      console.error('[recommend] GLM 调用失败，降级规则引擎：', err?.message)
    }
  }

  // ---- mock / 兜底：纯规则引擎 ----
  const result: RecommendResult = { source: 'mock', reason: '', meals: {} }
  for (const meal of meals) {
    const picks = rulePick(meal, body, exclude)
    picks.forEach((p) => exclude.add(p.id))
    result.meals[meal] = picks
  }
  const fav = topEntries(body.taste?.flavors as unknown as Record<string, number> ?? {}, 2).join('、')
  const dayText = body.day === 'tomorrow' ? '明日' : '今日'
  if (isFamily) {
    const labels = [...new Set(body.members!.map((m) => POP_LABELS[m.population] ?? m.population))].join('/')
    result.reason = `按全家成员需求（${labels}）取交集搭配：${fav ? `延续你们偏好的${fav}口味，` : ''}每道菜同时照顾到老人、孩子与特殊人群。`
  } else {
    result.reason = body.yesterday?.length
      ? `结合你昨天的饮食（${body.yesterday.slice(0, 3).join('、')}等）做营养缺口互补${fav ? `，并延续你对${fav}口味的偏好` : ''}。`
      : `${dayText}按${POP_LABELS[pop] ?? pop}搭配（三餐能量比约 3:4:3）${fav ? `，贴合你偏好的${fav}口味` : ''}。`
  }
  return result
})
