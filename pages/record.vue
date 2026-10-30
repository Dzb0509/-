<script setup lang="ts">
/**
 * 饮食记录：拍照识餐（辅助）+ 今日/昨日记录列表
 * 记录会自动更新口味画像，并作为「根据昨天推荐今天」的上下文
 */
import { MEAL_LABELS, sumNutrition } from '~/types/diet'

const diet = useDietStore()

function del(id: string) {
  diet.removeRecord(id)
  ElMessage.success('已删除该条记录')
}

function kcal(r: (typeof diet.records)[number]) {
  return Math.round(sumNutrition(r.foods).kcal)
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight">📔 饮食记录</h1>
      <p class="text-sm text-slate-400 mt-1">
        每一条记录都会让 AI 更懂你的口味，也是「根据昨天推荐今天」的数据来源
      </p>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <!-- 左：记录列表 -->
      <div class="xl:col-span-2 space-y-6">
        <!-- 今日 -->
        <section class="space-y-3">
          <h2 class="font-semibold px-1">今天（{{ diet.todayRecords.length }}）</h2>
          <div v-for="r in diet.todayRecords" :key="r.id" class="card !p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="chip bg-primary-50 text-primary-700">{{ MEAL_LABELS[r.meal] }}</span>
              <div class="flex items-center gap-3">
                <span class="text-xs text-slate-400 tabular-nums">≈ {{ kcal(r) }} kcal</span>
                <button class="text-xs text-slate-300 hover:text-red-400 transition-colors" @click="del(r.id)">删除</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="f in r.foods" :key="f.id" class="chip bg-slate-100 text-slate-600">{{ f.name }}</span>
            </div>
          </div>
          <p v-if="!diet.todayRecords.length" class="card text-center text-sm text-slate-400 !py-8">
            今天还没有记录 — 去首页点「吃了它」，或右侧拍照识餐 📷
          </p>
        </section>

        <!-- 昨日 -->
        <section v-if="diet.yesterdayRecords.length" class="space-y-3">
          <h2 class="font-semibold px-1">
            昨天（{{ diet.yesterdayRecords.length }}）
            <span class="text-xs font-normal text-slate-400 ml-1">首页的今日推荐会避开这些菜</span>
          </h2>
          <div v-for="r in diet.yesterdayRecords" :key="r.id" class="card !p-4 opacity-80">
            <div class="flex items-center gap-3 mb-2">
              <span class="chip bg-slate-100 text-slate-500">{{ MEAL_LABELS[r.meal] }}</span>
              <span class="text-xs text-slate-400 tabular-nums">≈ {{ kcal(r) }} kcal</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="f in r.foods" :key="f.id" class="chip bg-slate-100 text-slate-500">{{ f.name }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 右：拍照识餐（辅助） -->
      <div class="space-y-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <section class="card">
          <h2 class="font-semibold text-sm mb-1">📷 拍照识餐</h2>
          <p class="text-[11px] text-slate-400 mb-3">
            拍一张餐盘照片，AI 自动识别菜品、估重、算营养，确认后写入记录
          </p>
          <UploadCard />
        </section>

        <section class="card">
          <h2 class="font-semibold text-sm mb-3">画像学习进度</h2>
          <div class="space-y-2 text-xs text-slate-500">
            <p>累计记录 <b class="text-primary-600">{{ diet.records.length }}</b> 餐</p>
            <p>已学习口味标签 <b class="text-primary-600">{{ Object.keys(diet.tasteProfile.flavors).length }}</b> 个</p>
            <p>常吃食材 <b class="text-primary-600">{{ Object.keys(diet.tasteProfile.ingredients).length }}</b> 种</p>
          </div>
          <NuxtLink to="/" class="btn-primary !py-2 !text-sm w-full mt-4 inline-block text-center">
            回首页看今日推荐
          </NuxtLink>
        </section>
      </div>
    </div>
  </div>
</template>
