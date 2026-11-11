import { defineStore } from 'pinia'
import type { FoodItem, FoodRecord, UserProfile } from '~/types/diet'
import type { Dish, FamilyMember, PopulationId, UserRecipe, RecommendResult } from '~/types/recommend'
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

export interface DietUser {
  id: string
  profile: UserProfile
  records: FoodRecord[]
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
    const migratedUsers = (persisted?.users as DietUser[] | undefined)?.length
      ? persisted.users
      : [{ id: 'u-default', profile: (persisted?.profile ?? { ...DEFAULT_PROFILE }) as UserProfile, records: (persisted?.records ?? []) as FoodRecord[] }]
    const activeUser = migratedUsers.find((u) => u.id === (persisted?.activeUserId ?? 'u-default')) ?? migratedUsers[0]
    return {
      storageError: '',
      syncVersion: 0,
      lastSyncedAt: 0,
      users: migratedUsers as DietUser[],
      activeUserId: activeUser.id,
      recommendationPopulation: (persisted?.recommendationPopulation ?? activeUser.profile.population) as PopulationId,
      records: activeUser.records as FoodRecord[],
      profile: activeUser.profile as UserProfile,
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
      userRecipes: (persisted?.userRecipes ?? []) as UserRecipe[],
      /** 推荐结果缓存（按请求条件做 key）：进页面先展示上次结果再后台刷新，免骨架屏等待 */
      planCache: (persisted?.recommendationCacheVersion === 2 ? persisted.planCache ?? {} : {}) as Record<string, RecommendResult>
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
      for (const r of state.records) t = learnTaste(t, r.foods.map((f) => `${f.name}${f.region ? ` 菜系:${f.region}` : ''}`))
      return t
    }
  },

  actions: {
    syncActiveUser() {
      const user = this.users.find((u) => u.id === this.activeUserId)
      if (user) {
        user.profile = this.profile
        user.records = this.records
      }
    },
    switchUser(id: string) {
      if (id === this.activeUserId) return
      this.syncActiveUser()
      const user = this.users.find((u) => u.id === id)
      if (!user) return
      this.activeUserId = user.id
      this.profile = user.profile
      this.records = user.records
      this.recommendationPopulation = user.profile.population
      this.pending = null
      this.planCache = {}
      this.invalidateRecommendations()
      this.persist()
    },
    addUser(nickname: string) {
      const name = nickname.trim().slice(0, 12)
      if (!name) return
      this.syncActiveUser()
      const id = `u-${Date.now()}`
      const profile = { ...DEFAULT_PROFILE, nickname: name }
      this.users.push({ id, profile, records: [] })
      this.activeUserId = id
      this.profile = profile
      this.records = []
      this.recommendationPopulation = profile.population
      this.pending = null
      this.planCache = {}
      this.invalidateRecommendations()
      this.persist()
    },
    setRecommendationPopulation(population: PopulationId) {
      if (this.recommendationPopulation === population) return
      this.recommendationPopulation = population
      this.invalidateRecommendations()
      this.persist()
    },
    invalidateRecommendations() {
      this.planCache = {}
      this.syncVersion++
    },
    syncFromStorage() {
      const persisted = loadPersisted()
      if (!persisted) return
      const users = (persisted.users as DietUser[] | undefined) ?? [{ id: 'u-default', profile: persisted.profile ?? this.profile, records: persisted.records ?? [] }]
      this.users = users
      this.activeUserId = persisted.activeUserId ?? users[0].id
      const active = users.find((u) => u.id === this.activeUserId) ?? users[0]
      this.profile = active.profile
      this.records = active.records
      this.recommendationPopulation = persisted.recommendationPopulation ?? active.profile.population
      this.family = (persisted.family ?? this.family) as FamilyMember[]
      this.userRecipes = (persisted.userRecipes ?? this.userRecipes) as UserRecipe[]
      this.planCache = {}
      this.syncVersion++
      this.lastSyncedAt = Date.now()
    },
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
      this.invalidateRecommendations()
      if (!this.persist()) {
        this.records.shift()
        return null
      }
      this.pending = null
      return record
    },
    removeRecord(id: string) {
      this.records = this.records.filter((r) => r.id !== id)
      this.invalidateRecommendations()
      this.persist()
    },
    updateProfile(profile: Partial<UserProfile>) {
      this.profile = { ...this.profile, ...profile }
      this.invalidateRecommendations()
      this.persist()
    },
    addFamilyMember(m: Omit<FamilyMember, 'id'>) {
      this.family.push({ ...m, id: `m-${Date.now()}` })
      this.invalidateRecommendations()
      this.persist()
    },
    removeFamilyMember(id: string) {
      this.family = this.family.filter((m) => m.id !== id)
      this.invalidateRecommendations()
      this.persist()
    },
    updateFamilyMember(id: string, patch: Partial<FamilyMember>) {
      const m = this.family.find((x) => x.id === id)
      if (m) Object.assign(m, patch)
      this.invalidateRecommendations()
      this.persist()
    },
    addUserRecipe(r: Omit<UserRecipe, 'id'>) {
      this.userRecipes.push({ ...r, id: `ur-${Date.now()}` })
      this.invalidateRecommendations()
      this.persist()
    },
    removeUserRecipe(id: string) {
      this.userRecipes = this.userRecipes.filter((r) => r.id !== id)
      this.invalidateRecommendations()
      this.persist()
    },
    /** 缓存推荐结果（key = 请求条件摘要，如 population|day|custom） */
    cachePlan(key: string, plan: RecommendResult) {
      this.planCache[key] = plan
      // 只保留最近 8 份，防 localStorage 膨胀
      const keys = Object.keys(this.planCache)
      if (keys.length > 8) for (const k of keys.slice(0, keys.length - 8)) delete this.planCache[k]
      this.persist()
    },
    /** 把一道推荐菜按单人份写入今日餐盘（蛋白质等按菜品整份营养计算） */
    addDish(dish: Dish, meal: FoodRecord['meal'] = guessMeal()) {
      const item: FoodItem = {
        id: `${dish.id}-${Date.now()}`,
        name: dish.name,
        grams: 100,
        confidence: 1,
        region: dish.region,
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
      this.invalidateRecommendations()
      if (!this.persist()) this.records.shift()
    },
    persist() {
      if (!import.meta.client) return
      // 照片仅用于本次识别，持久化营养与菜品元数据，避免 base64 撑满配额。
      this.syncActiveUser()
      const users = this.users.map((user) => ({ ...user, records: user.records.map(({ image, ...record }) => record) }))
      const data = { recommendationCacheVersion: 2, users, activeUserId: this.activeUserId, recommendationPopulation: this.recommendationPopulation, records: this.records.map(({ image, ...record }) => record), profile: this.profile, family: this.family, userRecipes: this.userRecipes, planCache: this.planCache }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        this.storageError = ''
        this.lastSyncedAt = Date.now()
        return true
      } catch {
        // 推荐缓存可重建，优先保全用户记录。
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, planCache: {} }))
          this.planCache = {}
          this.storageError = ''
          return true
        } catch {
          this.storageError = '本地保存失败，请释放浏览器存储空间后重试；刷新前请保留当前页面。'
          return false
        }
      }
    }
  }
})
