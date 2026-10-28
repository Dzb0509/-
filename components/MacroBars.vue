<script setup lang="ts">
/**
 * 三大营养素进度条组
 */
const props = defineProps<{
  totals: { protein: number; fat: number; carb: number }
  goals: { protein: number; fat: number; carb: number }
}>()

const items = computed(() => [
  { key: 'protein', label: '蛋白质', value: props.totals.protein, goal: props.goals.protein, color: '#3B82F6' },
  { key: 'fat', label: '脂肪', value: props.totals.fat, goal: props.goals.fat, color: '#F59E0B' },
  { key: 'carb', label: '碳水', value: props.totals.carb, goal: props.goals.carb, color: '#8B5CF6' }
])
</script>

<template>
  <div class="space-y-3">
    <div v-for="item in items" :key="item.key">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-slate-500">{{ item.label }}</span>
        <span class="tabular-nums text-slate-400">
          {{ Math.round(item.value) }} / {{ item.goal }} g
        </span>
      </div>
      <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: `${Math.min(100, (item.value / item.goal) * 100)}%`, background: item.color }"
        />
      </div>
    </div>
  </div>
</template>
