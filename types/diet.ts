/** 营养素（单位：kcal / g），amount 表示“每 100g 含量”或“总量”，由使用处约定 */
export interface Nutrition {
  kcal: number
  protein: number
  fat: number
  carb: number
}

/** 单个识别出的食物项 */
export interface FoodItem {
  id: string
  name: string
  /** 识别估重（g），用户可修正 */
  grams: number
  /** 识别置信度 0-1 */
  confidence: number
  /** 每 100g 的营养含量（来自食物成分表/RAG 检索校准） */
  per100: Nutrition
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** 一次饮食记录 */
export interface FoodRecord {
  id: string
  meal: MealType
  time: number
  /** 识餐照片（压缩后的 dataURL，可缺省） */
  image?: string
  foods: FoodItem[]
}

export type GoalType = 'lose' | 'keep' | 'gain'

export interface UserProfile {
  nickname: string
  gender: 'male' | 'female'
  age: number
  height: number
  weight: number
  goal: GoalType
}

/** 计算某食物按当前克重的营养总量 */
export function foodNutrition(food: FoodItem): Nutrition {
  const r = food.grams / 100
  return {
    kcal: food.per100.kcal * r,
    protein: food.per100.protein * r,
    fat: food.per100.fat * r,
    carb: food.per100.carb * r
  }
}

export function sumNutrition(foods: FoodItem[]): Nutrition {
  return foods.reduce<Nutrition>(
    (acc, f) => {
      const n = foodNutrition(f)
      return {
        kcal: acc.kcal + n.kcal,
        protein: acc.protein + n.protein,
        fat: acc.fat + n.fat,
        carb: acc.carb + n.carb
      }
    },
    { kcal: 0, protein: 0, fat: 0, carb: 0 }
  )
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

/** 根据当前时间推断餐次 */
export function guessMeal(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
