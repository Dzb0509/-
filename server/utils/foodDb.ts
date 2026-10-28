// 精简内置食物成分表（每 100g，数据参考《中国食物成分表》）
// 正式版：RAG 检索校准 + 向量索引，此表作为保底数据源
export interface FoodDbEntry {
  name: string
  per100: { kcal: number; protein: number; fat: number; carb: number }
}

export const FOOD_DB: FoodDbEntry[] = [
  { name: '米饭', per100: { kcal: 116, protein: 2.6, fat: 0.3, carb: 25.9 } },
  { name: '红烧肉', per100: { kcal: 470, protein: 13.2, fat: 45.1, carb: 5.2 } },
  { name: '西兰花', per100: { kcal: 36, protein: 4.1, fat: 0.6, carb: 4.3 } },
  { name: '鸡胸肉', per100: { kcal: 133, protein: 24.6, fat: 3.4, carb: 0.6 } },
  { name: '番茄炒蛋', per100: { kcal: 88, protein: 5.1, fat: 6.2, carb: 3.6 } },
  { name: '清炒油麦菜', per100: { kcal: 42, protein: 1.4, fat: 3.1, carb: 2.1 } },
  { name: '紫薯', per100: { kcal: 106, protein: 1.3, fat: 0.2, carb: 25.2 } },
  { name: '煎蛋', per100: { kcal: 199, protein: 13.7, fat: 15.6, carb: 2.2 } },
  { name: '全麦面包', per100: { kcal: 246, protein: 10.4, fat: 3.4, carb: 45.7 } },
  { name: '拿铁咖啡', per100: { kcal: 43, protein: 2.3, fat: 1.8, carb: 4.8 } }
]

/** 骨架阶段 mock：随机返回 2-3 个菜品及估重；接入 GLM-4V 后替换为真实识别 */
export function mockRecognize(): Array<Omit<FoodItemKey, 'id'>> & Array<any> {
  const picks = [...FOOD_DB].sort(() => Math.random() - 0.5).slice(0, 2 + (Math.random() > 0.5 ? 1 : 0))
  return picks.map((p, i) => ({
    name: p.name,
    grams: [80, 120, 150, 200, 250][Math.floor(Math.random() * 5)],
    confidence: Math.round((0.75 + Math.random() * 0.2) * 100) / 100,
    per100: p.per100,
    id: `f-${Date.now()}-${i}`
  }))
}

type FoodItemKey = { id: string }
