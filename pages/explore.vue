<script setup lang="ts">
/**
 * 地方特色：分地区推荐符合健康原则的特色菜（八大菜系 + 地域家常）
 * 每道菜附做法与营养，可一键记录到今日餐盘
 */
import type { Dish } from '~/types/recommend'

const dishes = ref<Dish[]>([])
const loading = ref(true)

const REGIONS = ['全部', '川菜', '粤菜', '湘菜', '鲁菜', '苏浙菜', '闽菜', '徽菜', '东北菜', '西北面食', '家常菜']
const REGION_INTRO: Record<string, string> = {
  全部: '八大菜系与健康家常，总有一款合你胃口',
  川菜: '麻辣鲜香 — 已为你准备控油改良版',
  粤菜: '清蒸白灼为主，原汁原味低负担',
  湘菜: '香辣过瘾，高蛋白搭配',
  鲁菜: '北方豪迈风味，少油技法重现',
  苏浙菜: '江南清鲜，浓油赤酱的温柔版',
  闽菜: '酸甜清鲜，汤菜见长',
  徽菜: '山珍时令，重烧炖少油炸',
  东北菜: '炖菜暖身，发酵与根茎的智慧',
  西北面食: '碳水的快乐，蛋白质给力',
  家常菜: '快手健康，健身党的日常'
}

const active = ref('全部')

const shown = computed(() =>
  active.value === '全部' ? dishes.value : dishes.value.filter((d) => d.region === active.value)
)

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; dishes: Dish[] }>('/api/dishes')
    dishes.value = res.dishes
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight">🗺️ 地方特色 · 健康吃遍中国</h1>
      <p class="text-sm text-slate-400 mt-1">
        {{ REGION_INTRO[active] }} · 每道菜都是经过营养优化的版本，点击卡片可看做法
      </p>
    </header>

    <!-- 地区切换 -->
    <nav class="flex flex-wrap gap-2">
      <button
        v-for="r in REGIONS"
        :key="r"
        class="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
        :class="active === r
          ? 'bg-primary-500 border-primary-500 text-white'
          : 'bg-white border-slate-200 text-slate-500 hover:border-primary-300 hover:text-primary-600'"
        @click="active = r"
      >
        {{ r }}
      </button>
    </nav>

    <!-- 菜品网格 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="card h-56 animate-pulse !bg-slate-50" />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <DishCard v-for="d in shown" :key="d.id" :dish="d" />
    </div>
    <p v-if="!loading && !shown.length" class="text-center text-sm text-slate-400 py-10">
      这个地区暂时还没有菜，正在扩充菜单库…
    </p>

    <DisclaimerBar />
  </div>
</template>
