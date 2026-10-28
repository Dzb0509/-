<script setup lang="ts">
/**
 * Agent 分阶段思考可视化：识别 → 检索 → 点评
 */
const props = defineProps<{ stages: string[]; current: number }>()
</script>

<template>
  <ol class="flex items-center gap-2 text-xs">
    <li v-for="(s, i) in props.stages" :key="s" class="flex items-center gap-2">
      <div
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors"
        :class="
          i < props.current
            ? 'bg-emerald-50 text-emerald-600'
            : i === props.current
              ? 'bg-primary text-white'
              : 'bg-slate-100 text-slate-400'
        "
      >
        <span v-if="i < props.current">✓</span>
        <span
          v-else-if="i === props.current"
          class="w-3 h-3 rounded-full border-2 border-white/70 border-t-transparent animate-spin"
        />
        <span v-else class="w-3.5 text-center text-[10px]">{{ i + 1 }}</span>
        {{ s }}
      </div>
      <span v-if="i < props.stages.length - 1" class="text-slate-200">—</span>
    </li>
  </ol>
</template>
