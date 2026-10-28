<script setup lang="ts">
const props = defineProps<{ name: string }>()

const paths: Record<string, string> = {
  // 餐盘
  plate:
    'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm0-3.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Zm0-3.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
  // 对话气泡
  chat:
    'M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4.6 3.7A1 1 0 0 1 3 20.9V6a2 2 0 0 1 1-2Zm3 5h10M7 12.5h6',
  // 图表
  report:
    'M4 20h16M5 16l4-6 4 3 5-8M6 3h12a2 2 0 0 1 2 2v13H4V5a2 2 0 0 1 2-2Z',
  // 用户
  profile:
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  // 指南针（地方特色探索）
  explore:
    'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm3.5-12.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z',
  // 记事本（饮食记录）
  record:
    'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2.5 5h5M9.5 12h5M9.5 16h3'
}

const strokePaths: Record<string, boolean> = { chat: true, report: true, profile: true, explore: true, record: true }
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      :d="paths[props.name]"
      :fill="strokePaths[props.name] ? 'none' : 'currentColor'"
      :stroke="strokePaths[props.name] ? 'currentColor' : 'none'"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
