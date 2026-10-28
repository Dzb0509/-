<script setup lang="ts">
/**
 * 菜品卡片：名称/地域/口味标签/营养 + 做法展开 + 「吃了它」记录
 */
import type { Dish } from '~/types/recommend'
import { MEAL_LABELS } from '~/types/diet'

const props = withDefaults(defineProps<{ dish: Dish; meal?: 'breakfast' | 'lunch' | 'dinner' }>(), {
  meal: undefined
})
const emit = defineEmits<{ eat: [dish: Dish] }>()

const diet = useDietStore()
const open = ref(false)
const eaten = ref(false)

const flavorColors: Record<string, string> = {
  辣: 'bg-red-50 text-red-500',
  麻: 'bg-rose-50 text-rose-500',
  清淡: 'bg-emerald-50 text-emerald-600',
  咸鲜: 'bg-amber-50 text-amber-600',
  甜: 'bg-orange-50 text-orange-500',
  酸: 'bg-lime-50 text-lime-600',
  蒜香: 'bg-yellow-50 text-yellow-600',
  酱香: 'bg-stone-100 text-stone-600'
}

function eat() {
  eaten.value = true
  emit('eat', props.dish)
  diet.addDish(props.dish, props.meal)
  ElMessage.success(`已记录「${props.dish.name}」到${props.meal ? MEAL_LABELS[props.meal] : '今日'}餐盘 🍽️`)
}
</script>

<template>
  <div class="card !p-4 flex flex-col gap-2.5 hover:shadow-card-hover transition-shadow">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold text-[15px] truncate">{{ dish.name }}</h3>
        <p class="text-xs text-slate-400 mt-0.5">{{ dish.highlight }}</p>
      </div>
      <span class="chip shrink-0 bg-primary-50 text-primary-700">{{ dish.region }}</span>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="f in dish.flavors"
        :key="f"
        class="chip text-[11px]"
        :class="flavorColors[f] ?? 'bg-slate-100 text-slate-500'"
      >{{ f }}</span>
    </div>

    <div class="flex items-center gap-3 text-xs text-slate-500">
      <span><b class="text-primary-600 tabular-nums">{{ dish.nutrition.kcal }}</b> kcal</span>
      <span>蛋白 {{ dish.nutrition.protein }}g</span>
      <span>脂肪 {{ dish.nutrition.fat }}g</span>
      <span>碳水 {{ dish.nutrition.carb }}g</span>
    </div>

    <!-- 做法展开 -->
    <button
      class="self-start text-xs font-medium flex items-center gap-1 transition-colors"
      :class="open ? 'text-primary-700' : 'text-primary-600 hover:text-primary-700'"
      @click="open = !open"
    >
      {{ open ? '收起做法' : '查看做法' }}
      <span class="transition-transform" :class="open && 'rotate-90'">›</span>
    </button>
    <div v-if="open" class="rounded-xl bg-slate-50 p-3.5 space-y-2.5 text-xs leading-relaxed">
      <div>
        <p class="font-semibold text-slate-600 mb-1">🧺 食材</p>
        <p class="text-slate-500">{{ dish.ingredients.join('、') }}</p>
      </div>
      <div>
        <p class="font-semibold text-slate-600 mb-1">👨‍🍳 步骤</p>
        <ol class="space-y-1 list-decimal list-inside text-slate-500">
          <li v-for="(s, i) in dish.steps" :key="i">{{ s }}</li>
        </ol>
      </div>
    </div>

    <button class="btn-primary !py-2 !text-sm mt-auto" :disabled="eaten" @click="eat">
      {{ eaten ? '✓ 已记录' : '吃了它，记一笔' }}
    </button>
  </div>
</template>
