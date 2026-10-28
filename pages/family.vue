<script setup lang="ts">
/**
 * 家庭食谱：录入家庭成员（年龄+人群）→ AI 综合生成满足所有人的最优三餐
 */
import type { RecommendResult, Dish, FamilyMember, PopulationId } from '~/types/recommend'
import { POPULATIONS } from '~/types/recommend'
import { MEAL_LABELS } from '~/types/diet'

const diet = useDietStore()

const MEALS = [
  { key: 'breakfast' as const, emoji: '🌅' },
  { key: 'lunch' as const, emoji: '☀️' },
  { key: 'dinner' as const, emoji: '🌙' }
]

const plan = ref<RecommendResult | null>(null)
const loading = ref(false)
const refreshing = ref<('breakfast' | 'lunch' | 'dinner')[]>([])

// 新成员表单
const newLabel = ref('')
const newAge = ref(30)
const newPop = ref<PopulationId>('balance')

function addMember() {
  if (!newLabel.value.trim()) {
    ElMessage.warning('给成员起个称呼，如「爸爸」「大宝」')
    return
  }
  if (diet.family.length >= 8) {
    ElMessage.warning('最多添加 8 位成员')
    return
  }
  diet.addFamilyMember({
    label: newLabel.value.trim().slice(0, 6),
    age: newAge.value,
    population: newPop.value
  })
  newLabel.value = ''
  plan.value = null // 成员变化后旧推荐作废
  ElMessage.success('成员已添加，点「生成全家食谱」')
}

function removeMember(id: string) {
  diet.removeFamilyMember(id)
  plan.value = null
}

async function fetchPlan(meals?: ('breakfast' | 'lunch' | 'dinner')[]) {
  if (!diet.family.length) {
    ElMessage.warning('先添加至少一位家庭成员')
    return
  }
  if (meals?.length) refreshing.value = [...meals]
  else loading.value = true
  try {
    const res = await $fetch<RecommendResult>('/api/recommend', {
      method: 'POST',
      body: {
        members: diet.family,
        day: 'today',
        meals: meals ?? ['breakfast', 'lunch', 'dinner'],
        yesterday: diet.yesterdayNames,
        taste: diet.tasteProfile
      }
    })
    if (meals?.length && plan.value) {
      for (const m of meals) plan.value.meals[m] = res.meals[m]
      plan.value.source = res.source
    } else {
      plan.value = res
    }
  } catch {
    ElMessage.error('生成失败，请稍后重试')
  } finally {
    loading.value = false
    refreshing.value = []
  }
}

const familyPopSummary = computed(() =>
  [...new Set(diet.family.map((m) => POPULATIONS.find((p) => p.id === m.population)?.label ?? ''))].filter(Boolean).join(' / ')
)

const popLabel = (id: PopulationId) => POPULATIONS.find((p) => p.id === id)?.label ?? id
const popEmoji = (id: PopulationId) => POPULATIONS.find((p) => p.id === id)?.emoji ?? '👤'
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight">👨‍👩‍👧‍👦 家庭食谱 · 一桌菜照顾全家</h1>
      <p class="text-sm text-slate-400 mt-1">
        录入每位家人的年龄与人群，AI 会取「全家营养需求的交集」综合出一张餐桌都能吃的最优食谱
      </p>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <!-- 左：成员管理 -->
      <section class="card space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">家庭成员（{{ diet.family.length }}）</h2>
          <span class="text-[11px] text-slate-400">保存于本机</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="m in diet.family"
            :key="m.id"
            class="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5"
          >
            <span class="text-xl">{{ popEmoji(m.population) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ m.label }} <span class="text-xs text-slate-400 font-normal">{{ m.age }} 岁</span></p>
              <p class="text-[11px] text-slate-400">{{ popLabel(m.population) }}</p>
            </div>
            <el-select
              :model-value="m.population"
              size="small"
              class="!w-28"
              @update:model-value="(v: PopulationId) => { diet.updateFamilyMember(m.id, { population: v }); plan = null }"
            >
              <el-option v-for="p in POPULATIONS" :key="p.id" :value="p.id" :label="p.label" />
            </el-select>
            <button class="text-slate-300 hover:text-red-400 transition-colors text-xs" @click="removeMember(m.id)">✕</button>
          </div>
        </div>

        <!-- 添加成员 -->
        <div class="rounded-lg border border-dashed border-slate-200 p-3 space-y-2.5">
          <div class="flex gap-2">
            <el-input v-model="newLabel" placeholder="称呼，如：爸爸" size="small" maxlength="6" class="!w-28" />
            <el-input-number v-model="newAge" :min="1" :max="100" size="small" class="!w-24" />
            <el-select v-model="newPop" size="small" class="flex-1">
              <el-option v-for="p in POPULATIONS" :key="p.id" :value="p.id" :label="`${p.emoji} ${p.label}`" />
            </el-select>
          </div>
          <button class="btn-secondary !py-1.5 !text-xs w-full" @click="addMember">+ 添加成员</button>
        </div>

        <button class="btn-primary w-full" :disabled="loading || !diet.family.length" @click="fetchPlan()">
          {{ loading ? 'AI 正在统筹全家口味…' : '🍜 生成全家最优食谱' }}
        </button>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          当前覆盖人群：{{ familyPopSummary || '暂无' }}。AI 会避开昨天吃过的菜，并参考家庭口味画像。
        </p>
      </section>

      <!-- 右：推荐结果 -->
      <div class="xl:col-span-2 space-y-5">
        <section v-if="plan?.reason" class="card !py-3 !px-4 flex items-start gap-2.5">
          <span class="text-lg leading-none mt-0.5">🧑‍⚕️</span>
          <p class="text-sm text-slate-600 leading-relaxed">{{ plan.reason }}</p>
          <span class="ml-auto chip shrink-0" :class="plan.source === 'glm' ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-400'">
            {{ plan.source === 'glm' ? 'AI 个性化统筹' : '规则引擎' }}
          </span>
        </section>

        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="card h-64 animate-pulse !bg-slate-50" />
        </div>

        <template v-else-if="plan">
          <section v-for="m in MEALS" :key="m.key" class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="font-semibold flex items-center gap-2">
                <span>{{ m.emoji }}</span> {{ MEAL_LABELS[m.key] }}
              </h2>
              <button
                class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                :disabled="refreshing.includes(m.key)"
                @click="fetchPlan([m.key])"
              >
                {{ refreshing.includes(m.key) ? '换中…' : '换一换 ⟳' }}
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DishCard
                v-for="dish in plan.meals[m.key] ?? []"
                :key="dish.id"
                :dish="dish"
                :meal="m.key"
              />
            </div>
          </section>
        </template>

        <div v-else class="card text-center !py-14 space-y-2">
          <p class="text-4xl">🍽️</p>
          <p class="text-slate-500 text-sm">添加家庭成员后，点左侧「生成全家最优食谱」</p>
          <p class="text-xs text-slate-400">一道菜同时满足孕妈的营养、老人的牙口和孩子的长身体</p>
        </div>
      </div>
    </div>
  </div>
</template>
