import { defineStore } from 'pinia'
import type { FoodItem, FoodRecord, UserProfile } from '~/types/diet'
import { sumNutrition, guessMeal } from '~/types/diet'

const STORAGE_KEY = 'shike-ai-store-v1'

const DEFAULT_PROFILE: UserProfile = {
  nickname: '食刻用户',
  gender: 'male',
  age: 20,
  height: 172,
  weight: 62,
  goal: 'keep'
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
      /** 待确认的识餐结果（首页上传后 → 结果页确认） */
      pending: null as { image: string; foods: FoodItem[] } | null
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
    persist() {
      if (!import.meta.client) return
      // 骨架阶段使用 localStorage；正式版计划升级为 IndexedDB（接口保持一致）
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ records: this.records, profile: this.profile })
      )
    }
  }
})
