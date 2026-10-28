<script setup lang="ts">
import type { EChartsOption } from 'echarts'

/**
 * 环形进度图（ECharts）：显示某营养指标 当前值/目标值
 */
const props = withDefaults(
  defineProps<{
    value: number
    max: number
    label: string
    unit?: string
    color?: string
    size?: number
  }>(),
  { unit: '', color: '#10B981', size: 140 }
)

const pct = computed(() => (props.max > 0 ? Math.round((props.value / props.max) * 100) : 0))

const option = computed<EChartsOption>(() => ({
  series: [
    {
      type: 'pie',
      radius: ['78%', '92%'],
      startAngle: 90,
      silent: true,
      label: { show: false },
      data: [
        {
          value: Math.min(props.value, props.max),
          itemStyle: { color: props.color, borderRadius: 20 }
        },
        {
          value: Math.max(props.max - props.value, 0),
          itemStyle: { color: '#F1F5F9' }
        }
      ]
    }
  ]
}))
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <VChart :option="option" autoresize :style="{ width: `${size}px`, height: `${size}px` }" />
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-xl font-bold tabular-nums">{{ Math.round(value) }}</span>
      <span class="text-[11px] text-slate-400">/ {{ max }} {{ unit }}</span>
      <span class="text-xs font-medium mt-0.5" :style="{ color }">{{ label }} · {{ pct }}%</span>
    </div>
  </div>
</template>
