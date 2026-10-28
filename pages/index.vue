<script setup lang="ts">
/**
 * 首页：每日餐食推荐（主打）
 * - 分人群（均衡/减脂/增肌/控糖）
 * - 根据昨日饮食 + 口味画像个性化推荐今日/明日三餐
 * - 每道菜含做法、换一换、一键记录
 * - 右侧：今日概览、口味画像、拍照识餐（辅助）
 */
import type { RecommendResult, Dish, PopulationId } from '~/types/recommend'
import { POPULATIONS } from '~/types/recommend'
import { MEAL_LABELS, type MealType } from '~/types/diet'
import { topEntries } from '~/types/taste'

const diet = useDietStore()

const MEALS: { key: 'breakfast' | 'lunch' | 'dinner'; emoji: string; hint: string }[] = [
  { key: 'breakfast', emoji: '🌅', hint: '开启一天代谢' },
  { key: 'lunch', emoji: '☀️', hint: '吃饱吃好' },
  { key: 'dinner', emoji: '🌙', hint: '清淡易消化' }
]

const dayMode = ref<'today' | 'tomorrow'>('today')
const plan = ref<RecommendResult | null>(null)
const loading = ref(true)
const refreshing = ref<('breakfast' | 'lunch' | 'dinner')[]>([])

async function fetchPlan(meals?: ('breakfast' | 'lunch' | 'dinner')[]) {
  if (meals?.length) refreshing.value = [...meals]
  else loading.value = true
  try {
    const res = await $fetch<RecommendResult>('/api/recommend', {
      method: 'POST',
      body: {
        population: diet.profile.population,
        day: dayMode.value,
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
    ElMessage.error('推荐生成失败，请稍后重试')
  } finally {
    loading.value = false
    refreshing.value = []
  }
}

function switchDay(mode: 'today' | 'tomorrow') {
  dayMode.value = mode
  fetchPlan()
}

function switchPop(pop: PopulationId) {
  diet.updateProfile({ population: pop })
  fetchPlan()
}

const reasonLine = computed(() => plan.value?.reason ?? '')

const tasteTop = computed(() => ({
  flavors: topEntries(diet.tasteProfile.flavors as Record<string, number>, 4),
  regions: topEntries(diet.tasteProfile.regions, 3)
}))

const kcalPct = computed(() =>
  diet.dailyGoals.kcal > 0 ? Math.round((diet.todayTotals.kcal / diet.dailyGoals.kcal) * 100) : 0
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

onMounted(() => fetchPlan())
</script>

<template>
  <div class="space-y-6">
    <!-- 头部：问候 + 今日/明日切换 -->
    <header class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ greeting }}，{{ diet.profile.nickname }} 👋
        </h1>
        <p class="text-sm text-slate-400 mt-1">
          为你定制{{ dayMode === 'today' ? '今日' : '明日' }}三餐 · 吃过的每一餐都会让推荐更懂你
        </p>
      </div>
      <div class="flex rounded-xl bg-white shadow-card p-1 self-start">
        <button
          class="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
          :class="dayMode === 'today' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-primary-600'"
          @click="switchDay('today')"
        >
          今日推荐
        </button>
        <button
          class="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
          :class="dayMode === 'tomorrow' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-primary-600'"
          @click="switchDay('tomorrow')"
        >
          明日预告
        </button>
      </div>
    </header>

    <!-- 人群选择 -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button
        v-for="p in POPULATIONS"
        :key="p.id"
        class="card !p-4 text-left transition-all border-2"
        :class="diet.profile.population === p.id ? '!border-primary-400 ring-1 ring-primary-100' : '!border-transparent hover:!border-primary-100'"
        @click="switchPop(p.id)"
      >
        <span class="text-xl">{{ p.emoji }}</span>
        <p class="font-semibold text-sm mt-1">{{ p.label }}</p>
        <p class="text-[11px] text-slate-400 mt-0.5">{{ p.desc }}</p>
        <p class="text-[11px] text-primary-600 mt-1">{{ p.kcalHint }}</p>
      </button>
    </section>

    <!-- AI 推荐理由 -->
    <section v-if="reasonLine && !loading" class="card !py-3 !px-4 flex items-start gap-2.5">
      <span class="text-lg leading-none mt-0.5">🧑‍⚕️</span>
      <p class="text-sm text-slate-600 leading-relaxed">{{ reasonLine }}</p>
      <span class="ml-auto chip shrink-0" :class="plan?.source === 'glm' ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-400'">
        {{ plan?.source === 'glm' ? 'AI 个性化生成' : '规则引擎' }}
      </span>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <!-- 左：三餐推荐（主区） -->
      <div class="xl:col-span-2 space-y-5">
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="card h-64 animate-pulse !bg-slate-50" />
        </div>

        <template v-else>
          <section v-for="m in MEALS" :key="m.key" class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="font-semibold flex items-center gap-2">
                <span>{{ m.emoji }}</span> {{ MEAL_LABELS[m.key] }}
                <span class="text-xs font-normal text-slate-400">{{ m.hint }}</span>
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
                v-for="dish in plan?.meals[m.key] ?? []"
                :key="dish.id"
                :dish="dish"
                :meal="m.key"
              />
              <div v-if="refreshing.includes(m.key)" class="card !p-4 h-40 animate-pulse !bg-slate-50" />
            </div>
          </section>
        </template>
      </div>

      <!-- 右：概览 / 口味画像 / 识餐辅助 -->
      <div class="space-y-5 xl:sticky xl:top-6">
        <!-- 今日概览 -->
        <section class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold">今日概览</h2>
            <NuxtLink to="/report" class="text-xs text-primary-600 hover:underline">周报 →</NuxtLink>
          </div>
          <div class="flex items-center gap-5">
            <RingChart
              :value="diet.todayTotals.kcal"
              :max="diet.dailyGoals.kcal"
              label="热量"
              unit="kcal"
              :size="120"
            />
            <div class="flex-1">
              <MacroBars :totals="diet.todayTotals" :goals="diet.dailyGoals" />
              <p class="text-[11px] text-slate-400 mt-2">
                已完成 {{ kcalPct }}% · {{ diet.todayRecords.length }} 条记录
              </p>
            </div>
          </div>
        </section>

        <!-- 口味画像（越记越懂你） -->
        <section class="card">
          <h2 class="font-semibold mb-1">你的口味画像</h2>
          <p class="text-[11px] text-slate-400 mb-3">由 AI 从你的每一餐自动学习，推荐随之进化</p>
          <template v-if="tasteTop.flavors.length || tasteTop.regions.length">
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="f in tasteTop.flavors"
                :key="f"
                class="chip bg-primary-50 text-primary-700"
              >{{ f }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="r in tasteTop.regions"
                :key="r"
                class="chip bg-amber-50 text-amber-600"
              >{{ r }}</span>
            </div>
          </template>
          <p v-else class="text-sm text-slate-400">
            还没有数据 — 从上面的推荐里点「吃了它」开始记录吧
          </p>
        </section>

        <!-- 拍照识餐（辅助功能） -->
        <section class="card !border-dashed !border-primary-200">
          <h2 class="font-semibold text-sm mb-1">📷 拍照记录（辅助）</h2>
          <p class="text-[11px] text-slate-400 mb-3">在外吃了一餐不知道热量？拍一张，AI 帮你识别记录，画像也会同步更新</p>
          <UploadCard compact />
        </section>
      </div>
    </div>

    <DisclaimerBar />
  </div>
</template>
