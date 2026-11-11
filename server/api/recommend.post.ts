import { defineEventHandler, readBody, createError } from 'h3'
import { createHash } from 'node:crypto'
import { DISHES, filterDishes, BREAKFAST_IDS, SNACK_IDS } from '../utils/dishes'
import { hasTextKey, llmChat } from '../utils/zhipu'
import { retrieve } from '../utils/rag'
import { webSearch, webHitsToPrompt } from '../utils/websearch'
import type { Dish, FamilyMember, PopulationId, RecommendResult, DishRole, UserRecipe } from '~/types/recommend'
import { POP_MAP, FAMILY_SET, dishRole } from '~/types/recommend'
import type { TasteProfile } from '~/types/taste'
import { topEntries } from '~/types/taste'

type MealKey = 'breakfast' | 'lunch' | 'dinner'
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

interface Body {
  population?: PopulationId
  /** 家庭模式：传入成员列表时按「全家交集需求」综合推荐 */
  members?: FamilyMember[]
  meals?: MealKey[]
  day?: 'today' | 'tomorrow'
  yesterday?: string[]
  taste?: TasteProfile
  /** AI 自定义偏好（口味/需求/忌口） */
  custom?: { flavors?: string[]; needs?: string; taboos?: string }
  /** 用户上传的家传菜谱（参与全家推荐，优先入选） */
  customRecipes?: UserRecipe[]
  seed?: number
  /** fast=true：「换一换」快速模式——跳过 GLM/联网搜索，本地规则引擎毫秒级换一批 */
  fast?: boolean
  /** fast 模式排除的菜名（当前已展示的菜，保证换出来的不重复） */
  excludeNames?: string[]
}

/** 忌口过滤：菜名或食材命中忌口关键词则剔除 */
function tabooHit(d: Dish, taboos?: string): boolean {
  if (!taboos) return false
  return taboos
    .split(/[，,、;；/\s]+/)
    .map(t => t.replace(/^(?:不吃|不能吃|忌口|忌食|避免|不要吃)[:：]?/, ''))
    .filter(Boolean)
    .some((t) => d.name.includes(t) || [...d.ingredients, ...d.steps].some((i) => i.includes(t)))
}

function dishNameKey(name: string): string {
  return name.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s·・、，,。！!？?]/g, '').toLowerCase()
}

function uniqueDishes(dishes: Dish[]): Dish[] {
  const seen = new Set<string>()
  return dishes.filter((d) => {
    const key = dishNameKey(d.name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 所有推荐路径共用硬约束，包含每个家庭成员的忌口及步骤中的食材。 */
function allowed(d: Dish, body: Body): boolean {
  return !(body.excludeNames ?? []).includes(d.name)
    && ![body.custom?.taboos, ...(body.members ?? []).map(m => m.custom?.taboos)].some(t => tabooHit(d, t))
}

function validateBody(value: unknown): Body {
  const bad = () => { throw createError({ statusCode: 400, statusMessage: 'Invalid recommendation request' }) }
  const object = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v)
  const strings = (v: any, max = 100, size = 500) => Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string' && x.length <= size)
  const custom = (v: any) => object(v) && (v.flavors === undefined || strings(v.flavors, 20))
    && ['needs', 'taboos', 'summary'].every(k => v[k] === undefined || typeof v[k] === 'string' && v[k].length <= 2000)
  if (!object(value)) return bad()
  const b = value as any
  if (b.population !== undefined && !Object.hasOwn(POP_MAP, b.population)) bad()
  if (b.meals !== undefined && (!strings(b.meals, 3) || !b.meals.every((m: any) => MEAL_KEYS.includes(m)))) bad()
  if (b.day !== undefined && !['today', 'tomorrow'].includes(b.day)) bad()
  if (b.fast !== undefined && typeof b.fast !== 'boolean') bad()
  for (const k of ['yesterday', 'excludeNames']) if (b[k] !== undefined && !strings(b[k], 600)) bad()
  if (b.custom !== undefined && !custom(b.custom)) bad()
  if (b.members !== undefined && (!Array.isArray(b.members) || b.members.length > 8 || !b.members.every((m: any) =>
    object(m) && Object.hasOwn(POP_MAP, m.population) && Number.isFinite(m.age) && m.age >= 0 && m.age <= 120
    && (m.label === undefined || typeof m.label === 'string' && m.label.length <= 40) && (m.custom === undefined || custom(m.custom))))) bad()
  if (b.customRecipes !== undefined && (!Array.isArray(b.customRecipes) || b.customRecipes.length > 100 || !b.customRecipes.every((r: any) =>
    object(r) && typeof r.name === 'string' && r.name.length <= 100 && strings(r.ingredients, 30) && strings(r.steps, 30)
    && (r.id === undefined || typeof r.id === 'string' && r.id.length <= 100) && (r.note === undefined || typeof r.note === 'string' && r.note.length <= 1000)))) bad()
  if (b.taste !== undefined && (!object(b.taste) || !['flavors', 'regions', 'ingredients'].every(k => b.taste[k] === undefined || object(b.taste[k]) && Object.entries(b.taste[k]).length <= 100 && Object.values(b.taste[k]).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e6)))) bad()
  return b as Body
}

/** 用户菜谱 → Dish（营养按家常菜估算，角色由 dishRole 判定，图片走 dish-image 按名生成） */
function userRecipeToDish(r: UserRecipe): Dish | null {
  const name = String(r.name ?? '').trim().slice(0, 20)
  if (!name) return null
  return {
    id: `u-${r.id || createHash('md5').update(name).digest('hex').slice(0, 8)}`,
    name,
    region: '我家菜谱',
    flavors: [],
    pops: ['balance', 'child', 'elderly', 'pregnant', 'lactation', 'hypertension', 'diabetes', 'hyperlipid'],
    nutrition: { kcal: 320, protein: 14, fat: 12, carb: 30 },
    ingredients: (r.ingredients ?? []).slice(0, 12),
    steps: (r.steps ?? []).slice(0, 12),
    highlight: r.note?.slice(0, 40) || '来自我家的私房菜谱',
    source: 'user'
  }
}

/** 家庭候选须满足全部成员标签，不足时不放宽硬约束。 */
function familyCandidates(meal: MealKey, members: FamilyMember[], extra: Dish[] = []): Dish[] {
  const pops = [...new Set(members.map((m) => m.population))]
  const wide = DISHES.filter((d) =>
    meal === 'breakfast' ? BREAKFAST_IDS.includes(d.id) : !BREAKFAST_IDS.includes(d.id) && !SNACK_IDS.includes(d.id)
  )
  // 人群约束不能因候选不足而放宽。
  const out = wide.filter((d) => pops.every((p) => p === 'balance' || d.pops.includes(p)))
  // 用户上传的家传菜谱直接进入候选池（角色由 dishRole 判定，rulePick 中优先入选）
  for (const d of extra) if (pops.every((p) => p === 'balance' || d.pops.includes(p)) && !out.some((x) => x.id === d.id)) out.unshift(d)
  return out
}

/** 规则引擎：按口味/地域画像与昨日重复度打分；传 role 时只选该角色（荤/素/汤/主食）的菜 */
function rulePick(meal: MealKey, body: Body, exclude: Set<string>, role?: DishRole, extra: Dish[] = []): Dish[] {
  const pool = uniqueDishes(body.members?.length ? familyCandidates(meal, body.members, extra) : filterDishes(body.population ?? 'balance', meal))
    .filter((d) => !exclude.has(d.id) && allowed(d, body))
  const target = role ? pool.filter((d) => dishRole(d) === role) : pool
  const finalPool = target.length ? target : pool // 该角色凑不出时退回全池
  const scored = finalPool.map((d) => {
    let s = Math.random() * 0.8 // 轻微随机，保证「换一换」有变化
    if (d.source === 'user') s += 3 // 用户家传菜谱优先入选
    const flavors = body.taste?.flavors ?? {}
    for (const f of d.flavors) s += (flavors[f as keyof typeof flavors] ?? 0) * 1.5
    // AI 自定义口味偏好加权
    for (const f of body.custom?.flavors ?? []) if (d.flavors.includes(f)) s += 1.2
    const regions = body.taste?.regions ?? {}
    s += (regions[d.region] ?? 0) * 1.2
    // 昨天吃过的菜名降权
    if (body.yesterday?.some((y) => y.includes(d.name) || d.name.includes(y))) s -= 5
    return { d, s }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, role ? 1 : 2).map((x) => x.d)
}

/** 家庭模式「一整份」：按角色组合逐位选菜（早 3 道 / 午晚各 4 道），角色凑不齐时用普通选择补足 */
function familyRuleSet(meal: MealKey, body: Body, exclude: Set<string>, extra: Dish[] = []): Dish[] {
  const used = new Set(exclude)
  const out: Dish[] = []
  for (const role of FAMILY_SET[meal]) {
    const pick = rulePick(meal, body, used, role, extra)
    if (pick.length) {
      out.push(pick[0])
      used.add(pick[0].id)
    }
  }
  while (out.length < FAMILY_SET[meal].length) {
    const pick = rulePick(meal, body, used, undefined, extra)
    if (!pick.length) break
    out.push(pick[0])
    used.add(pick[0].id)
  }
  return out
}

/** 家庭模式单餐 GLM 候选：按角色配额采样，确保每个角色都有足量可选菜（家传菜谱必进候选） */
function buildFamilyCandidates(meal: MealKey, body: Body, roles: DishRole[], extra: Dish[] = []) {
  const alive = familyCandidates(meal, body.members!, extra).filter(
    (d) => allowed(d, body) && !body.yesterday?.some((y) => y.includes(d.name))
  )
  const byRole = roles.flatMap((r) => alive.filter((d) => dishRole(d) === r).slice(0, 6))
  const candPool = [...new Map([...extra.filter(d => alive.some(a => a.id === d.id)), ...byRole, ...alive.slice(0, 10)].map((d) => [d.id, d])).values()]
  return candPool.map((d) => ({
    id: d.id, name: d.name, region: d.region, flavors: d.flavors,
    kcal: d.nutrition.kcal, highlight: d.highlight, role: dishRole(d),
    source: d.source ?? 'local'
  }))
}

/** 把 GLM 返回的菜按「一整份」角色顺序重排：家传菜谱保底入座 → GLM 按角色入座 → 缺的角色用规则引擎补位 → 仍不足时任意补齐（同角色不堆叠） */
function composeFamilySet(meal: MealKey, glmDishes: Dish[], fallback: Dish[], used: Set<string>, userDishes: Dish[] = []): Dish[] {
  const out: Dish[] = []
  const localUsed = new Set(used)
  const localNames = new Set<string>()
  const filled = new Set<DishRole>()
  const capacity = FAMILY_SET[meal].length
  const tryAdd = (d: Dish, role?: DishRole): boolean => {
    if (out.length >= capacity || localUsed.has(d.id) || localNames.has(dishNameKey(d.name))) return false
    const r = dishRole(d)
    if (role && r !== role) return false
    if (!role && filled.has(r)) return false // 补位时不让同一角色堆叠
    out.push(d)
    localUsed.add(d.id)
    localNames.add(dishNameKey(d.name))
    filled.add(r)
    used.add(d.id)
    return true
  }
  // 0) 用户家传菜谱保底入座（每餐最多 1 道，角色不冲突即可）
  const u = userDishes.find((d) => !localUsed.has(d.id) && FAMILY_SET[meal].includes(dishRole(d)))
  if (u) tryAdd(u, dishRole(u))
  // 1) GLM 结果按角色入座
  for (const role of FAMILY_SET[meal]) {
    if (filled.has(role)) continue
    const g = glmDishes.find((d) => !localUsed.has(d.id) && dishRole(d) === role)
    if (g) tryAdd(g, role)
  }
  // 2) 缺的角色从规则引擎兜底里补
  for (const role of FAMILY_SET[meal]) {
    if (filled.has(role)) continue
    const f = fallback.find((d) => !localUsed.has(d.id) && dishRole(d) === role)
    if (f) tryAdd(f, role)
  }
  // 3) 仍不足则任意补齐
  for (const d of [...glmDishes, ...fallback]) {
    if (out.length >= capacity) break
    tryAdd(d)
  }
  return out
}

export default defineEventHandler(async (handler): Promise<RecommendResult> => {
  const body = validateBody(await readBody(handler))
  const pop = body.population ?? 'balance'
  const meals = body.meals?.length ? [...new Set(body.meals)] : MEAL_KEYS
  const exclude = new Set<string>()
  const isFamily = !!body.members?.length

  const memberText = (m: FamilyMember) => {
    const p = POP_MAP[m.population]
    const c = m.custom
    const custom = c
      ? `，个人需求：${[c.needs, c.taboos ? `忌口${c.taboos}` : '', c.flavors?.length ? `偏好${c.flavors.join('/')}` : ''].filter(Boolean).join('、')}`
      : ''
    return `${m.label || '成员'}（${m.age}岁，${p?.label ?? m.population}${custom}）`
  }
  const userLabel = isFamily
    ? `一个 ${body.members!.length} 口之家：${body.members!.map(memberText).join('、')}`
    : `${POP_MAP[pop]?.label ?? pop}人群${body.custom?.needs ? `（需求：${body.custom.needs}）` : ''}${body.custom?.taboos ? `，忌口：${body.custom.taboos}` : ''}`
  const tasteText = [
    topEntries(body.taste?.flavors as unknown as Record<string, number> ?? {}, 3).join('、'),
    topEntries(body.taste?.regions ?? {}, 2).join('、')
  ].filter(Boolean)

  const userDishes = (body.customRecipes ?? []).map(userRecipeToDish)
    .filter((d): d is Dish => !!d && allowed(d, body))
  const initialExclude = new Set([...DISHES, ...userDishes].filter(d => !allowed(d, body)).map(d => d.id))
  const ruleResponse = (): RecommendResult => {
    const used = new Set(initialExclude)
    const result: RecommendResult = { source: 'rule', reason: '已按人群与忌口筛选，候选不足时保留空缺。', meals: {} }
    for (const meal of meals) {
      const picks = isFamily ? familyRuleSet(meal, body, used, userDishes) : rulePick(meal, body, used)
      picks.forEach(d => used.add(d.id))
      result.meals[meal] = picks
    }
    return result
  }
  if (body.fast || !hasTextKey()) return ruleResponse()
  // ---- 模型只可在已通过硬约束的候选中选择 ----
  if (hasTextKey()) {
    try {
      const ruleResult: RecommendResult = { source: 'glm', reason: '', meals: {} }
      const usedIds = new Set(initialExclude)
      for (const meal of meals) {
        const picks = isFamily ? familyRuleSet(meal, body, exclude, userDishes) : rulePick(meal, body, exclude)
        picks.forEach((p) => exclude.add(p.id))
        ruleResult.meals[meal] = picks
      }

      const guide = await retrieve(
        `${userLabel}三餐搭配原则` + (tasteText.length ? `，偏好${tasteText.join('/')}` : ''),
        2
      ).catch(() => [] as string[])

      const baseSys = `你是营养师。${isFamily ? '这是家庭模式：一桌菜要尽量同时满足所有成员的营养需求（例如有孕妇就保证叶酸与优质蛋白、有老人就软烂低盐、有孩子就营养密度高且不太辣），并兼顾大人的口味。推荐理由只能基于上方实际给定的家庭成员构成，严禁虚构未提及的成员或需求。' : '根据用户画像挑选合适的菜。'}`
      const MEAL_LABEL: Record<MealKey, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }

      let glmReason = ''
      /** 家庭模式：三餐并行（联网搜索与 GLM 择优同时进行），跨餐不重复由「禁选名单 + usedIds 兜底去重」保证 */
      if (isFamily) {
        const reasons: string[] = []
        const out: RecommendResult = { source: 'glm', reason: '', meals: {} }

        // 第 1 步：三餐候选与联网搜索并行准备（互不阻塞）
        const prep = await Promise.all(
          meals.map(async (meal) => {
            const roleName = meal === 'breakfast' ? '主食+蛋白质+蔬果各一道' : '一荤、一素、一汤、一主食'
            const candidates = buildFamilyCandidates(meal, body, FAMILY_SET[meal], userDishes)
            // 联网搜索贴合本家庭构成的菜谱灵感（失败静默跳过；有 10 分钟缓存）
            const webHits = await webSearch(
              `适合${userLabel}的${MEAL_LABEL[meal]}家常菜谱 ${roleName} 营养搭配做法`,
              5
            )
            const webBlock = webHits.length
              ? `\n【联网搜索参考】（仅用于搭配理由，不新增未核验菜品）\n${webHitsToPrompt(webHits)}`
              : ''
            return { meal, candidates, webBlock }
          })
        )

        // 第 2 步：三餐 GLM 择优并行执行（单餐失败只降级该餐，不影响其他餐）
        await Promise.all(
          prep.map(async ({ meal, candidates, webBlock }) => {
            const roleName = meal === 'breakfast' ? '主食+蛋白质+蔬果各一道' : '一荤、一素、一汤、一主食'
            const sys = `${baseSys}为本餐组成一整份餐桌套餐：${roleName}。候选菜中的 role 字段标注了每道菜的角色（meat荤/veg素/soup汤/staple主食），请严格按角色各挑一道；source 为 user 的是用户家传菜谱，请优先采用。菜品不得出现在「禁止选择」名单中。并用不超过 40 字说明本餐这样搭配照顾了哪些成员。
严格输出 JSON：{"reason":"...","ids":["id1","id2"]}（ids 最多 ${FAMILY_SET[meal].length} 个，必须来自本餐候选列表；不足时留空缺）`
            // 其他餐次的候选菜名作为禁选名单（并行时无法传"已定菜单"，用候选名单近似规避跨餐重复）
            const otherNames = prep
              .filter((p) => p.meal !== meal)
              .flatMap((p) => p.candidates.map((c) => c.name))
            const user = `家庭构成：${userLabel}${tasteText.length ? `，口味偏好：${tasteText.join('、')}` : '（暂无口味数据）'}
禁止选择（其他餐次候选，避免跨餐重复）：${otherNames.join('、') || '无'}
膳食指南参考：${guide.join('；') || '主食粗细搭配，每餐有蛋白质与蔬菜'}${webBlock}
本餐候选菜：${JSON.stringify(candidates)}`
            try {
              const res = await llmChat([
                { role: 'system', content: sys },
                { role: 'user', content: user }
              ])
              const text: string = res.choices?.[0]?.message?.content ?? ''
              const m = text.match(/\{[\s\S]*\}/)
              let glmDishes: Dish[] = []
              if (m) {
                const parsed = JSON.parse(m[0])
                const ids: string[] = Array.isArray(parsed.ids) ? parsed.ids : []
                glmDishes = ids.filter(id => candidates.some(c => c.id === id)).map(id => [...DISHES, ...userDishes].find(d => d.id === id)).filter((d): d is Dish => !!d && allowed(d, body))
                const r = String(parsed.reason ?? '').trim()
                if (r) reasons.push(r.slice(0, 60))
              }
              // usedIds 兜底去重：即便 GLM 无视禁选名单，跨餐重复菜也会被规则引擎替换
              out.meals[meal] = composeFamilySet(meal, glmDishes, ruleResult.meals[meal] ?? [], usedIds, userDishes.filter(d => candidates.some(c => c.id === d.id)))
            } catch (mealErr: any) {
              console.error(`[recommend] 家庭模式 ${meal} 餐 GLM 失败，本餐降级规则引擎：`, mealErr?.message)
              out.meals[meal] = composeFamilySet(meal, [], ruleResult.meals[meal] ?? [], usedIds, userDishes.filter(d => candidates.some(c => c.id === d.id)))
            }
          })
        )
        glmReason = reasons.join(' ')
        return { ...out, reason: `${glmReason.slice(0, 120)} 候选不足的餐次保留空缺，请核对后补充。` }
      }

      // 个人模式：单次调用规划全部餐次
      const candidates: Record<string, { id: string; name: string; region: string; flavors: string[]; kcal: number; highlight: string }[]> = {}
      for (const meal of meals) {
        const pool = filterDishes(pop, meal).filter(d => allowed(d, body))
        candidates[meal] = pool
          .filter((d) => allowed(d, body) && !body.yesterday?.some((y) => y.includes(d.name)))
          .slice(0, 12)
          .map(({ id, name, region, flavors, nutrition, highlight }) => ({
            id, name, region, flavors, kcal: nutrition.kcal, highlight
          }))
      }

      const sys = `${baseSys}从候选菜中为每餐挑选 2 道最合适的菜（贴合口味偏好、避免与昨天吃的重复，三餐之间也不要重复）。并用不超过 60 字给出整体推荐理由（须结合用户口味/昨日饮食说「为什么这样搭配」）。
严格输出 JSON：{"reason":"...","meals":{"breakfast":["d001"],"lunch":["d101"],"dinner":["d201"]}}（仅含要求的餐次，每餐恰好 2 个菜品 id，必须来自候选列表）`
      const user = `用户：${userLabel}${tasteText.length ? `，口味偏好：${tasteText.join('、')}` : '（暂无口味数据）'}
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
          const used = new Set(Object.values(out.meals).flat().map(d => d.id))
          const usedNames = new Set(Object.values(out.meals).flat().map(d => dishNameKey(d.name)))
          const pool = filterDishes(pop, meal).filter(d => allowed(d, body))
          const picks: Dish[] = []
          for (const d of [...ids.filter(id => candidates[meal].some(c => c.id === id)).map(id => pool.find(d => d.id === id)), ...pool]) {
            if (!d || used.has(d.id) || usedNames.has(dishNameKey(d.name))) continue
            picks.push(d)
            used.add(d.id)
            usedNames.add(dishNameKey(d.name))
            if (picks.length === 2) break
          }
          out.meals[meal] = picks
        }
        return out
      }
      throw new Error('解析失败')
    } catch (err: any) {
      console.error('[recommend] GLM 调用失败，降级规则引擎：', err?.message)
    }
  }

  return ruleResponse()
})
