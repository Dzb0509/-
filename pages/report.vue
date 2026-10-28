<script setup lang="ts">
/**
 * 周报页：7 天趋势图 + AI 周报总结（流式）
 */
const diet = useDietStore()

// 近 7 天日期标签
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (6 - i))
  return d
})
const dayLabels = days.map((d) => `${d.getMonth() + 1}/${d.getDate()}`)

// 骨架阶段：真实记录 + mock 数据混合展示；正式版全部由记录驱动
const kcalSeries = computed(() => {
  return days.map((d) => {
    const start = new Date(d)
    start.setHours(0, 0, 0, 0)
    const end = start.getTime() + 86400000
    const foods = diet.records
      .filter((r) => r.time >= start.getTime() && r.time < end)
      .flatMap((r) => r.foods)
    if (foods.length) return Math.round(sumNutrition(foods).kcal)
    // mock：有记录的日子用真实值，无记录补演示数据
    return 1450 + Math.round(Math.random() * 500)
  })
})

const kcalOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 16, top: 24, bottom: 28 },
  xAxis: { type: 'category', data: dayLabels, axisTick: { show: false } },
  yAxis: { type: 'value', name: 'kcal', splitLine: { lineStyle: { color: '#F1F5F9' } } },
  series: [
    {
      type: 'line',
      data: kcalSeries.value,
      smooth: true,
      symbolSize: 7,
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

// AI 周报流式总结
const reportText = ref('')
const generating = ref(false)
async function generate() {
  generating.value = true
  reportText.value = ''
  try {
    await streamSSE('/api/report', {}, (e) => {
      if (e.type === 'text') reportText.value += e.text ?? ''
    })
  } catch {
    reportText.value = '生成失败，请重试。'
  } finally {
    generating.value = false
  }
}
onMounted(generate)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">📊 营养周报</h1>
      <p class="text-sm text-slate-400 mt-1">最近 7 天的摄入趋势与 AI 总结</p>
    </header>

    <!-- 趋势图 -->
    <section class="card">
      <h2 class="font-semibold mb-2">每日热量趋势</h2>
      <VChart :option="kcalOption" autoresize style="height: 260px" />
    </section>

    <!-- 概览指标 -->
    <section class="grid grid-cols-3 gap-3">
      <div class="card !p-4 text-center">
        <p class="text-xs text-slate-400">记录餐数</p>
        <p class="text-2xl font-bold mt-1 tabular-nums">{{ diet.records.length }}</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-xs text-slate-400">日均热量</p>
        <p class="text-2xl font-bold mt-1 tabular-nums text-primary-600">
          {{ Math.round(kcalSeries.reduce((a, b) => a + b, 0) / 7) }}
        </p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-xs text-slate-400">目标达成</p>
        <p class="text-2xl font-bold mt-1 tabular-nums text-accent">
          {{
            Math.round(
              (kcalSeries.filter((k) => k <= diet.dailyGoals.kcal).length / 7) * 100
            )
          }}%
        </p>
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
