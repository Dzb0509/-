<script setup lang="ts">
/**
 * AI 悬浮小助手：右下角营养师小人，点击打开侧滑对话抽屉
 */
const open = ref(false)
const route = useRoute()
/* 在完整对话页时隐藏，避免重复 */
const hidden = computed(() => route.path === '/chat')
</script>

<template>
  <div v-if="!hidden">
    <!-- 悬浮小人 -->
    <button
      v-show="!open"
      class="fixed bottom-6 right-6 z-50 group"
      title="召唤 AI 营养师"
      @click="open = true"
    >
      <span class="absolute inset-0 rounded-full bg-primary-400/40 animate-ping" />
      <span
        class="relative flex w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-card-hover items-center justify-center text-2xl transition-transform group-hover:scale-110"
      >
        🧑‍⚕️
      </span>
      <span
        class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shadow"
      >AI</span>
    </button>

    <!-- 对话抽屉 -->
    <el-drawer v-model="open" title="AI 营养师" direction="rtl" size="420px" class="ai-drawer">
      <div class="h-full">
        <ChatPanel compact />
      </div>
    </el-drawer>
  </div>
</template>

<style>
.ai-drawer .el-drawer__header {
  margin-bottom: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-weight: 600;
}
.ai-drawer .el-drawer__body {
  padding: 12px 16px 16px;
  overflow: hidden;
}
</style>
