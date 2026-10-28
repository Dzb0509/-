import type { Nutrition } from './diet'

/** 人群定位 */
export type PopulationId = 'balance' | 'lose' | 'muscle' | 'sugar'

export interface Population {
  id: PopulationId
  label: string
  emoji: string
  desc: string
  /** 每日热量建议区间（用于推荐理由展示） */
  kcalHint: string
}

export const POPULATIONS: Population[] = [
  { id: 'balance', label: '均衡饮食', emoji: '⚖️', desc: '营养全面，比例合理', kcalHint: '1800~2200 kcal' },
  { id: 'lose', label: '减脂控卡', emoji: '🔥', desc: '热量缺口，高蛋白饱腹', kcalHint: '1400~1700 kcal' },
  { id: 'muscle', label: '增肌塑形', emoji: '💪', desc: '高蛋白，训练日加餐', kcalHint: '2200~2600 kcal' },
  { id: 'sugar', label: '控糖稳糖', emoji: '🩸', desc: '低 GI，缓释碳水', kcalHint: '1600~1900 kcal' }
]

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
