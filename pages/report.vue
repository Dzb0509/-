<script setup lang="ts">
/**
 * 周报页：7 天真实记录趋势 + 本周饮食画像 + AI 周报总结（GLM 流式，真实数据驱动）
 */
const diet = useDietStore()

import { sumNutrition } from '~/types/diet'
import { learnTaste, emptyTaste, topEntries } from '~/types/taste'
import { POP_MAP } from '~/types/recommend'

// 近 7 天日期标签
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (6 - i))
  return d
})
const dayLabels = days.map((d) => `${d.getMonth() + 1}/${d.getDate()}`)

const weekRecords = computed(() => {
  const start = new Date(days[0]); start.setHours(0, 0, 0, 0)
  const end = new Date(days[6]); end.setHours(24, 0, 0, 0)
  return diet.records.filter(r => r.time >= start.getTime() && r.time < end.getTime())
})

/** 某天的记录 foods（仅真实数据，无记录为 null，图表断开显示） */
function foodsOfDay(d: Date) {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const end = start.getTime() + 86400000
  return diet.records
    .filter((r) => r.time >= start.getTime() && r.time < end)
    .flatMap((r) => r.foods)
}

const kcalSeries = computed<(number | null)[]>(() => {
  return days.map((d) => {
    const foods = foodsOfDay(d)
    return foods.length ? Math.round(sumNutrition(foods).kcal) : null
  })
})

/** 有记录的天数（指标与 AI 周报均只基于真实数据） */
const recordedCount = computed(() => kcalSeries.value.filter((k) => k != null).length)
const avgKcal = computed(() => {
  const vals = kcalSeries.value.filter((k): k is number => k != null)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
})
const goalRate = computed(() => {
  const vals = kcalSeries.value.filter((k): k is number => k != null)
  return vals.length
    ? Math.round((vals.filter((k) => k <= diet.dailyGoals.kcal).length / vals.length) * 100)
    : 0
})

/** 每日菜名清单（传给 AI 周报） */
const dayMeals = computed(() =>
  days.map((d) => [...new Set(foodsOfDay(d).map((f) => f.name))])
)

/** 本周饮食画像：常吃菜品 Top5 */
const topDishes = computed(() => {
  const counter = new Map<string, number>()
  for (const r of weekRecords.value) {
    for (const f of r.foods) counter.set(f.name, (counter.get(f.name) ?? 0) + 1)
  }
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)
})
const tasteTags = computed(() => {
  let taste = emptyTaste()
  for (const r of weekRecords.value) taste = learnTaste(taste, r.foods.map(f => `${f.name}${f.region ? ` 菜系:${f.region}` : ''}`))
  return topEntries(taste.flavors as Record<string, number>, 4)
})
const regionTags = computed(() => {
  let taste = emptyTaste()
  for (const r of weekRecords.value) taste = learnTaste(taste, r.foods.map(f => `${f.name}${f.region ? ` 菜系:${f.region}` : ''}`))
  return topEntries(taste.regions, 4)
})

const kcalOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: number | null) => (v == null ? '未记录' : `${v} kcal`)
  },
  grid: { left: 40, right: 16, top: 24, bottom: 28 },
  xAxis: { type: 'category', data: dayLabels, axisTick: { show: false } },
  yAxis: { type: 'value', name: 'kcal', splitLine: { lineStyle: { color: '#F1F5F9' } } },
  series: [
    {
      type: 'line',
      data: kcalSeries.value,
      smooth: true,
      symbolSize: 7,
      connectNulls: false,
      lineStyle: { color: '#10B981', width: 3 },
      itemStyle: { color: '#10B981' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16,185,129,0.25)' },
            { offset: 1, color: 'rgba(16,185,129,0)' }
          ]
        }
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#F97316', type: 'dashed' },
        label: { formatter: '目标 {c}', color: '#F97316' },
        data: [{ yAxis: diet.dailyGoals.kcal }]
      }
    }
  ]
}))

// AI 周报流式总结（GLM 真流式 + 真实数据上下文；无 Key 降级规则文案）
const reportText = ref('')
const generating = ref(false)
const reportInputKey = computed(() => diet.records.map(r => `${r.id}:${r.time}:${r.foods.map(f => `${f.name}:${f.region ?? ''}:${f.grams}`).join(',')}`).join('|'))
let reportRefreshTimer: ReturnType<typeof setTimeout> | null = null
async function generate() {
  generating.value = true
  reportText.value = ''
  try {
    await streamSSE('/api/report', {
      nickname: diet.profile.nickname,
      populationLabel: POP_MAP[diet.profile.population]?.label ?? diet.profile.population,
      goal: diet.profile.goal,
      dailyGoals: diet.dailyGoals,
      days: days.map((d, i) => ({ label: dayLabels[i], kcal: kcalSeries.value[i], meals: dayMeals.value[i] })),
      avgKcal: avgKcal.value,
      goalRate: goalRate.value,
      taste: tasteTags.value,
      tasteRegions: regionTags.value,
      topDishes: topDishes.value
    }, (e) => {
      if (e.type === 'text') reportText.value += e.text ?? ''
    })
  } catch {
    reportText.value = '生成失败，请重试。'
  } finally {
    generating.value = false
  }
}
onMounted(generate)
watch(reportInputKey, () => {
  if (reportRefreshTimer) clearTimeout(reportRefreshTimer)
  reportRefreshTimer = setTimeout(() => generate(), 180)
})
onUnmounted(() => { if (reportRefreshTimer) clearTimeout(reportRefreshTimer) })
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">📊 营养周报</h1>
      <p class="text-sm text-slate-400 mt-1">最近 7 天的真实摄入趋势与 AI 总结</p>
    </header>

    <!-- 趋势图 -->
    <section class="card">
      <h2 class="font-semibold mb-2">每日热量趋势</h2>
      <p v-if="!recordedCount" class="text-sm text-slate-400 mb-2">还没有记录 — 去「饮食记录」页拍照识餐，数据会出现在这里</p>
      <VChart :option="kcalOption" autoresize style="height: 260px" />
    </section>

    <!-- 概览指标（仅统计真实记录） -->
    <section class="grid grid-cols-3 gap-3">
      <div class="card !p-4 text-center">
        <p class="text-xs text-slate-400">记录餐数</p>
        <p class="text-2xl font-bold mt-1 tabular-nums">{{ weekRecords.length }}</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-xs text-slate-400">日均热量</p>
        <p v-if="recordedCount" class="text-2xl font-bold mt-1 tabular-nums text-primary-600">{{ avgKcal }}</p>
        <p v-else class="text-2xl font-bold mt-1 text-slate-300">—</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-xs text-slate-400">目标达成</p>
        <p v-if="recordedCount" class="text-2xl font-bold mt-1 tabular-nums text-accent">{{ goalRate }}%</p>
        <p v-else class="text-2xl font-bold mt-1 text-slate-300">—</p>
      </div>
    </section>

    <!-- 本周饮食画像 -->
    <section v-if="topDishes.length || tasteTags.length || regionTags.length" class="card">
      <h2 class="font-semibold mb-3">本周饮食画像</h2>
      <div class="space-y-3">
        <div v-if="topDishes.length">
          <p class="text-xs font-semibold text-slate-500 mb-1.5">常吃菜品 Top5</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="(d, i) in topDishes" :key="d" class="chip" :class="i === 0 ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-600'">{{ i === 0 ? '🏆 ' : '' }}{{ d }}</span>
          </div>
        </div>
        <div v-if="tasteTags.length">
          <p class="text-xs font-semibold text-slate-500 mb-1.5">口味偏好（AI 从记录中学习）</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="t in tasteTags" :key="t" class="chip bg-amber-50 text-amber-600">{{ t }}</span>
          </div>
        </div>
        <div v-if="regionTags.length">
          <p class="text-xs font-semibold text-slate-500 mb-1.5">常吃地域/风味</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="t in regionTags" :key="t" class="chip bg-sky-50 text-sky-600">{{ t }}</span>
          </div>
        </div>
        <p class="text-[11px] text-slate-400">画像会反哺首页推荐：常吃的、爱吃的会被优先考虑，同时自动避开重复</p>
      </div>
    </section>

    <!-- AI 周报 -->
    <section class="card">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold flex items-center gap-2">🤖 AI 周报总结</h2>
        <button
          class="text-xs text-primary-600 hover:underline disabled:opacity-40"
          :disabled="generating"
          @click="generate"
        >
          {{ generating ? '生成中…' : '重新生成' }}
        </button>
      </div>
      <div class="rounded-xl bg-slate-50 p-4 text-sm leading-7 min-h-28 whitespace-pre-wrap">
        {{ reportText || (generating ? 'AI 正在分析本周数据…' : '') }}
        <span v-if="generating && reportText" class="animate-pulse text-primary-500">▍</span>
      </div>
    </section>

    <DisclaimerBar />
  </div>
</template>
