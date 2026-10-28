<script setup lang="ts">
const diet = useDietStore()

import { MEAL_LABELS } from '~/types/diet'

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const dateLabel = new Date().toLocaleDateString('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})

const kcalPct = computed(() =>
  diet.dailyGoals.kcal > 0 ? Math.round((diet.todayTotals.kcal / diet.dailyGoals.kcal) * 100) : 0
)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <!-- 顶部问候 -->
    <header>
      <h1 class="text-2xl font-bold tracking-tight">{{ greeting }}，{{ diet.profile.nickname }} 👋</h1>
      <p class="text-sm text-slate-400 mt-1">{{ dateLabel }} · 今天吃了什么？拍给我看看</p>
    </header>

    <!-- 上传 -->
    <UploadCard />

    <!-- 今日概览 -->
    <section class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold">今日摄入概览</h2>
        <NuxtLink to="/report" class="text-xs text-primary-600 hover:underline">查看周报 →</NuxtLink>
      </div>
      <div class="flex flex-col sm:flex-row items-center gap-6">
        <RingChart
          :value="diet.todayTotals.kcal"
          :max="diet.dailyGoals.kcal"
          label="热量"
          unit="kcal"
          :size="150"
        />
        <div class="flex-1 w-full">
          <MacroBars :totals="diet.todayTotals" :goals="diet.dailyGoals" />
          <p class="text-[11px] text-slate-400 mt-3">
            目标：{{ diet.dailyGoals.kcal }} kcal · {{ kcalPct <= 100 ? '还可摄入' : '已超出' }}
            {{ Math.abs(diet.dailyGoals.kcal - Math.round(diet.todayTotals.kcal)) }} kcal
          </p>
        </div>
      </div>
    </section>

    <!-- 今日记录 -->
    <section v-if="diet.todayRecords.length" class="space-y-3">
      <h2 class="font-semibold px-1">今日记录（{{ diet.todayRecords.length }}）</h2>
      <div v-for="r in diet.todayRecords" :key="r.id" class="card !p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="chip bg-primary-50 text-primary-700">{{ MEAL_LABELS[r.meal] }}</span>
          <button
            class="text-xs text-slate-300 hover:text-red-400 transition-colors"
            @click="diet.removeRecord(r.id)"
          >
            删除
          </button>
        </div>
        <div class="space-y-2">
          <FoodCard v-for="f in r.foods" :key="f.id" :food="f" />
        </div>
      </div>
    </section>
    <p v-else class="text-center text-sm text-slate-400 py-4">今天还没有记录，上传第一张餐盘照片吧 🍚</p>

    <DisclaimerBar />
  </div>
</template>
