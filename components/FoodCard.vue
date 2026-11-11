<script setup lang="ts">
/**
 * 食物卡片：展示识别结果，支持修正克重（低置信度高亮提示）
 */
import type { FoodItem } from '~/types/diet'
const props = defineProps<{ food: FoodItem; editable?: boolean }>()
const emit = defineEmits<{ remove: [] }>()

import { foodNutrition } from '~/types/diet'

const nutrition = computed(() => foodNutrition(props.food))
const lowConfidence = computed(() => props.food.confidence < 0.8)

function onGramsChange(val: number | undefined) {
  if (typeof val === 'number' && val > 0) props.food.grams = Math.round(val)
}
</script>

<template>
  <div class="card !p-4 flex items-center gap-4">
    <div
      class="w-12 h-12 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-xl"
    >
      🍽️
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-semibold">{{ food.name }}</span>
        <span
          class="chip"
          :class="lowConfidence ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'"
        >
          置信度 {{ Math.round(food.confidence * 100) }}%
        </span>
        <span v-if="lowConfidence && editable" class="text-[11px] text-amber-500">建议核对份量</span>
      </div>
      <p class="text-xs text-slate-400 mt-1 tabular-nums">
        {{ Math.round(nutrition.kcal) }} kcal · 蛋白 {{ nutrition.protein.toFixed(1) }}g · 脂肪
        {{ nutrition.fat.toFixed(1) }}g · 碳水 {{ nutrition.carb.toFixed(1) }}g
      </p>
      <div class="mt-2 flex items-center gap-2">
        <span class="text-[11px] text-slate-400">地域/风味</span>
        <el-input
          v-if="editable"
          v-model="food.region"
          maxlength="20"
          size="small"
          class="!w-32"
          placeholder="如：炭火烧烤"
        />
        <span v-else class="chip bg-slate-100 text-slate-500">{{ food.region || '未标注' }}</span>
      </div>
    </div>
    <div v-if="editable" class="shrink-0 flex items-center gap-2">
      <el-input-number
        :model-value="food.grams"
        :min="5"
        :max="1500"
        :step="10"
        size="small"
        controls-position="right"
        style="width: 110px"
        @change="onGramsChange"
      />
      <span class="text-xs text-slate-400">g</span>
      <el-button size="small" type="danger" text circle @click.stop="emit('remove')">
        <span class="text-base leading-none">✕</span>
      </el-button>
    </div>
    <div v-else class="shrink-0 text-right">
      <span class="font-bold tabular-nums">{{ food.grams }}</span>
      <span class="text-xs text-slate-400 ml-0.5">g</span>
    </div>
  </div>
</template>
