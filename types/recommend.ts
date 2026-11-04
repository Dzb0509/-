import type { Nutrition } from './diet'

/**
 * 人群采用两级结构：
 * 第一级「人群组」（POP_GROUPS）：婴幼儿 / 儿童青少年 / 成年人 / 孕产期 / 老年人
 * 第二级「细分需求」：成年人下分均衡/减脂/增肌/控糖；老年人下分普通/高血压/糖尿病/高血脂等
 * 保存到 profile.population 的是第二级的具体 id。
 */
export type PopulationId =
  | 'balance' | 'lose' | 'muscle' | 'sugar'                       // 成年人
  | 'elderly' | 'hypertension' | 'diabetes' | 'hyperlipid'        // 老年人及慢病
  | 'child'                                                        // 儿童青少年
  | 'infant' | 'toddler'                                           // 婴幼儿
  | 'pregnant' | 'lactation'                                       // 孕产期

export interface Population {
  id: PopulationId
  label: string
  emoji: string
  desc: string
  /** 适用年龄段（推荐时结合年龄校验） */
  ageHint: string
  /** 每日热量建议区间（用于推荐理由展示） */
  kcalHint: string
}

/** 全部人群（扁平列表：下拉选择/家庭模式用） */
export const POPULATIONS: Population[] = [
  // 成年人
  { id: 'balance', label: '均衡饮食', emoji: '⚖️', desc: '营养全面，比例合理', ageHint: '18~59岁成人', kcalHint: '1800~2200 kcal' },
  { id: 'lose', label: '减脂控卡', emoji: '🔥', desc: '热量缺口，高蛋白饱腹', ageHint: '18~59岁成人', kcalHint: '1400~1700 kcal' },
  { id: 'muscle', label: '增肌塑形', emoji: '💪', desc: '高蛋白，训练日加餐', ageHint: '18~40岁成人', kcalHint: '2200~2600 kcal' },
  { id: 'sugar', label: '控糖稳糖', emoji: '🩸', desc: '低 GI，缓释碳水', ageHint: '血糖偏高人群', kcalHint: '1600~1900 kcal' },
  // 老年人及慢病细分
  { id: 'elderly', label: '普通老年', emoji: '🧓', desc: '软烂易嚼，低盐高钙', ageHint: '60岁以上', kcalHint: '1600~1900 kcal' },
  { id: 'hypertension', label: '高血压', emoji: '🫀', desc: '严格低钠，高钾高钙', ageHint: '高血压人群', kcalHint: '1500~1800 kcal' },
  { id: 'diabetes', label: '糖尿病', emoji: '🩸', desc: '低 GI 控糖，定时定量', ageHint: '糖尿病人群', kcalHint: '1500~1800 kcal' },
  { id: 'hyperlipid', label: '高血脂', emoji: '🫁', desc: '低脂低胆固醇，高纤维', ageHint: '血脂偏高人群', kcalHint: '1500~1800 kcal' },
  // 儿童青少年
  { id: 'child', label: '儿童青少年', emoji: '🧒', desc: '长身体，钙铁锌跟上', ageHint: '3~17岁', kcalHint: '1400~2300 kcal' },
  // 婴幼儿
  { id: 'infant', label: '辅食期婴儿', emoji: '👶', desc: '6~12月龄，无盐无糖细腻泥糊', ageHint: '6~12月龄', kcalHint: '随奶量约 900 kcal' },
  { id: 'toddler', label: '幼儿', emoji: '🍼', desc: '1~3岁，软烂小块，清淡少盐', ageHint: '1~3岁', kcalHint: '1000~1300 kcal' },
  // 孕产期
  { id: 'pregnant', label: '孕期', emoji: '🤰', desc: '叶酸铁钙，易消化少刺激', ageHint: '孕期', kcalHint: '1900~2300 kcal' },
  { id: 'lactation', label: '哺乳期', emoji: '🤱', desc: '催乳营养，下汤水足', ageHint: '哺乳期', kcalHint: '2100~2500 kcal' }
]

export const POP_MAP: Record<string, Population> = Object.fromEntries(POPULATIONS.map((p) => [p.id, p]))

/** 人群组（第一级）：首页「先选人群 → 再选需求」用 */
export interface PopGroup {
  id: string
  label: string
  emoji: string
  desc: string
  options: PopulationId[]
}

export const POP_GROUPS: PopGroup[] = [
  { id: 'adult', label: '成年人', emoji: '🧑', desc: '18~59岁', options: ['balance', 'lose', 'muscle', 'sugar'] },
  { id: 'elderly', label: '老年人', emoji: '🧓', desc: '60岁以上，可按慢病细分', options: ['elderly', 'hypertension', 'diabetes', 'hyperlipid'] },
  { id: 'child', label: '儿童青少年', emoji: '🧒', desc: '3~17岁，长身体', options: ['child'] },
  { id: 'infant', label: '婴幼儿', emoji: '👶', desc: '6月龄~3岁，辅食期', options: ['infant', 'toddler'] },
  { id: 'pregnant', label: '孕产期', emoji: '🤰', desc: '孕期与哺乳期', options: ['pregnant', 'lactation'] }
]

/** 用户 AI 自定义偏好（口味/需求/忌口），由 /api/customize 生成摘要 */
export interface CustomPref {
  /** 口味偏好标签 */
  flavors: string[]
  /** 需求描述（如“想控糖但爱吃辣”） */
  needs: string
  /** 忌口（如“不吃香菜、海鲜过敏”） */
  taboos: string
  /** AI 生成的个性化方案摘要 */
  summary?: string
  /** AI 生成：宜吃清单 */
  goodFor?: string[]
  /** AI 生成：忌口/慎吃清单 */
  avoid?: string[]
  /** AI 生成：注意事项 */
  tips?: string[]
}

/** 家庭成员（家庭模式：按年龄+人群综合出全家最优食谱，支持 AI 自定义） */
export interface FamilyMember {
  id: string
  /** 称呼，如「妈妈」「爷爷」 */
  label: string
  age: number
  population: PopulationId
  /** 该成员的 AI 自定义（口味/忌口/需求），推荐时一并纳入 */
  custom?: CustomPref
}

/** 一道推荐菜（含做法） */
export interface Dish {
  id: string
  name: string
  /** 地域/菜系，如「川菜」「粤菜」「东北家常」 */
  region: string
  /** 口味标签 */
  flavors: string[]
  /** 适合人群 */
  pops: PopulationId[]
  /** 单人份营养 */
  nutrition: Nutrition
  /** 主要食材 */
  ingredients: string[]
  /** 做法步骤 */
  steps: string[]
  /** 一句话亮点（AI/规则引擎生成理由时也复用） */
  highlight: string
  /** 菜谱来源：缺省=本地菜库；web=AI 联网搜索；user=用户上传的家传菜谱 */
  source?: 'web' | 'user'
}

/** 用户上传的自家菜谱（参与全家推荐，localStorage 持久化） */
export interface UserRecipe {
  id: string
  name: string
  /** 食材清单（一行一个） */
  ingredients: string[]
  /** 做法步骤（一行一步） */
  steps: string[]
  /** 一句话介绍/口味特点（可空） */
  note?: string
}

/** 推荐结果：按餐次分组 */
export type MealPlan = Partial<Record<'breakfast' | 'lunch' | 'dinner', Dish[]>>

export interface RecommendResult {
  source: 'glm' | 'mock' | 'rule'
  /** AI 推荐理由（结合昨日饮食与口味） */
  reason: string
  meals: MealPlan
}

/** 菜品角色：荤菜 / 素菜 / 汤羹 / 主食（家庭模式「一桌菜」组合用） */
export type DishRole = 'meat' | 'veg' | 'soup' | 'staple'

export const DISH_ROLE_LABELS: Record<DishRole, string> = {
  meat: '荤菜',
  veg: '素菜',
  soup: '汤羹',
  staple: '主食'
}

export const DISH_ROLE_EMOJIS: Record<DishRole, string> = {
  meat: '🍖',
  veg: '🥬',
  soup: '🍲',
  staple: '🍚'
}

/** 家庭模式每餐的「一整份」组成：早 3 道（主食+蛋白+果蔬），午晚各 4 道（一荤一素一汤一主食） */
export const FAMILY_SET: Record<'breakfast' | 'lunch' | 'dinner', DishRole[]> = {
  breakfast: ['staple', 'meat', 'veg'],
  lunch: ['meat', 'veg', 'soup', 'staple'],
  dinner: ['meat', 'veg', 'soup', 'staple']
}

/** 启发式判定菜品角色（按菜名与食材关键词，无需人工标注） */
export function dishRole(d: { name: string; ingredients: string[] }): DishRole {
  const name = d.name ?? ''
  if (/汤|羹|煲$/.test(name)) return 'soup'
  if (/粥|米饭|炒饭|烩饭|盖饭|面|馒头|包子|饺子|馄饨|饼|吐司|面包|燕麦|玉米|红薯|土豆泥|年糕|粉/.test(name)) return 'staple'
  const text = name + (d.ingredients ?? []).join('')
  if (/肉|鸡|鸭|鹅|鱼|虾|蟹|牛|羊|排|肝|腰|肠|培根|火腿|蛋|海鲜|贝|鳕|鲈|带鱼|黄鳝|鱿鱼/.test(text)) return 'meat'
  return 'veg'
}
