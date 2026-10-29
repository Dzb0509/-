import { defineStore } from 'pinia'
import type { FoodItem, FoodRecord, UserProfile } from '~/types/diet'
import type { Dish, FamilyMember, PopulationId, UserRecipe } from '~/types/recommend'
import { sumNutrition, guessMeal } from '~/types/diet'
import { learnTaste, emptyTaste, type TasteProfile } from '~/types/taste'

const STORAGE_KEY = 'shike-ai-store-v1'

const DEFAULT_PROFILE: UserProfile = {
  nickname: '食刻用户',
  gender: 'male',
  age: 20,
  height: 172,
  weight: 62,
  goal: 'keep',
  population: 'balance' as PopulationId
}

function loadPersisted() {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useDietStore = defineStore('diet', {
  state: () => {
    const persisted = loadPersisted()
    return {
      records: (persisted?.records ?? []) as FoodRecord[],
      profile: (persisted?.profile ?? { ...DEFAULT_PROFILE }) as UserProfile,
      /** 家庭成员（家庭模式） */
      family: (persisted?.family ?? [
        { id: 'm1', label: '爸爸', age: 40, population: 'balance' },
        { id: 'm2', label: '妈妈', age: 38, population: 'balance' },
        { id: 'm3', label: '女儿', age: 10, population: 'child' },
        { id: 'm4', label: '奶奶', age: 68, population: 'elderly' }
      ]) as FamilyMember[],
      /** 待确认的识餐结果（上传后 → 结果页确认） */
      pending: null as { image: string; foods: FoodItem[] } | null,
      /** 用户上传的家传菜谱（参与全家推荐） */
      userRecipes: (persisted?.userRecipes ?? []) as UserRecipe[]
    }
  },

  getters: {
    todayRecords(state): FoodRecord[] {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = today.getTime()
      return state.records.filter((r) => r.time >= start)
    },
    todayTotals(): { kcal: number; protein: number; fat: number; carb: number } {
      const foods = this.todayRecords.flatMap((r) => r.foods)
      return sumNutrition(foods)
    },
    /** 每日营养目标：Mifflin-St Jeor 公式估算 BMR，活动系数 1.375，按目标微调 */
    dailyGoals(state): { kcal: number; protein: number; fat: number; carb: number } {
      const p = state.profile
      const bmr =
        10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'male' ? 5 : -161)
      let kcal = bmr * 1.375
      if (p.goal === 'lose') kcal -= 300
      if (p.goal === 'gain') kcal += 300
      kcal = Math.round(kcal)
      const protein = Math.round(p.weight * 1.5)
      const fat = Math.round((kcal * 0.25) / 9)
      const carb = Math.round((kcal - protein * 4 - fat * 9) / 4)
      return { kcal, protein, fat, carb }
    },
    /** 昨日饮食记录（用于「根据昨天推荐今天/明天」） */
    yesterdayRecords(state): FoodRecord[] {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      y.setHours(0, 0, 0, 0)
      const start = y.getTime()
      const end = start + 86400_000
      return state.records.filter((r) => r.time >= start && r.time < end)
    },
    /** 昨日吃过的食物/菜名列表 */
    yesterdayNames(): string[] {
      return [...new Set(this.yesterdayRecords.flatMap((r) => r.foods.map((f) => f.name)))]
    },
    /** 口味画像：从全部历史记录自动学习（越记越准） */
    tasteProfile(state): TasteProfile {
      let t = emptyTaste()
      for (const r of state.records) t = learnTaste(t, r.foods.map((f) => f.name))
      return t
    }
  },

  actions: {
    startAnalysis(image: string, foods: FoodItem[]) {
      this.pending = { image, foods }
    },
    confirmPending(): FoodRecord | null {
      if (!this.pending) return null
      const record: FoodRecord = {
        id: `r-${Date.now()}`,
        meal: guessMeal(),
        time: Date.now(),
        image: this.pending.image,
        foods: this.pending.foods
      }
      this.records.unshift(record)
      this.pending = null
      this.persist()
      return record
    },
    removeRecord(id: string) {
      this.records = this.records.filter((r) => r.id !== id)
      this.persist()
    },
    updateProfile(profile: Partial<UserProfile>) {
      this.profile = { ...this.profile, ...profile }
      this.persist()
    },
    addFamilyMember(m: Omit<FamilyMember, 'id'>) {
      this.family.push({ ...m, id: `m-${Date.now()}` })
      this.persist()
    },
    removeFamilyMember(id: string) {
      this.family = this.family.filter((m) => m.id !== id)
      this.persist()
    },
    updateFamilyMember(id: string, patch: Partial<FamilyMember>) {
      const m = this.family.find((x) => x.id === id)
      if (m) Object.assign(m, patch)
      this.persist()
    },
    addUserRecipe(r: Omit<UserRecipe, 'id'>) {
      this.userRecipes.push({ ...r, id: `ur-${Date.now()}` })
      this.persist()
    },
    removeUserRecipe(id: string) {
      this.userRecipes = this.userRecipes.filter((r) => r.id !== id)
      this.persist()
    },
    /** 把一道推荐菜按单人份写入今日餐盘（蛋白质等按菜品整份营养计算） */
    addDish(dish: Dish, meal: FoodRecord['meal'] = guessMeal()) {
      const item: FoodItem = {
        id: `${dish.id}-${Date.now()}`,
        name: dish.name,
        grams: 100,
        confidence: 1,
        // 菜品营养为单人份总量：借 grams=100 + per100 使 foodNutrition() 恰好还原
        per100: { ...dish.nutrition }
      }
      const record: FoodRecord = {
        id: `r-${Date.now()}`,
        meal,
        time: Date.now(),
        foods: [item]
      }
      this.records.unshift(record)
      this.persist()
    },
    persist() {
      if (!import.meta.client) return
      // 骨架阶段使用 localStorage；正式版计划升级为 IndexedDB（接口保持一致）
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ records: this.records, profile: this.profile, family: this.family, userRecipes: this.userRecipes })
      )
    }
  }
})
