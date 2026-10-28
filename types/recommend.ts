import type { Nutrition } from './diet'

/** 人群定位 */
export type PopulationId = 'balance' | 'lose' | 'muscle' | 'sugar' | 'child' | 'pregnant' | 'elderly'

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

export const POPULATIONS: Population[] = [
  { id: 'balance', label: '均衡饮食', emoji: '⚖️', desc: '营养全面，比例合理', ageHint: '18~50岁成人', kcalHint: '1800~2200 kcal' },
  { id: 'lose', label: '减脂控卡', emoji: '🔥', desc: '热量缺口，高蛋白饱腹', ageHint: '18~50岁成人', kcalHint: '1400~1700 kcal' },
  { id: 'muscle', label: '增肌塑形', emoji: '💪', desc: '高蛋白，训练日加餐', ageHint: '18~40岁成人', kcalHint: '2200~2600 kcal' },
  { id: 'sugar', label: '控糖稳糖', emoji: '🩸', desc: '低 GI，缓释碳水', ageHint: '血糖偏高人群', kcalHint: '1600~1900 kcal' },
  { id: 'child', label: '儿童青少年', emoji: '🧒', desc: '长身体，钙铁锌跟上', ageHint: '6~17岁', kcalHint: '1400~2300 kcal' },
  { id: 'pregnant', label: '孕产期', emoji: '🤰', desc: '叶酸铁钙，易消化少刺激', ageHint: '孕期/哺乳期', kcalHint: '1900~2300 kcal' },
  { id: 'elderly', label: '老年人', emoji: '🧓', desc: '软烂易嚼，低盐高钙', ageHint: '60岁以上', kcalHint: '1600~1900 kcal' }
]

/** 家庭成员（家庭模式：按年龄+人群综合出全家最优食谱） */
export interface FamilyMember {
  id: string
  /** 称呼，如「妈妈」「爷爷」 */
  label: string
  age: number
  population: PopulationId
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
}

/** 推荐结果：按餐次分组 */
export type MealPlan = Partial<Record<'breakfast' | 'lunch' | 'dinner', Dish[]>>

export interface RecommendResult {
  source: 'glm' | 'mock'
  /** AI 推荐理由（结合昨日饮食与口味） */
  reason: string
  meals: MealPlan
}
