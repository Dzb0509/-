<script setup lang="ts">
/**
 * 上传卡片：点击/拖拽选择食物照片 → 压缩 → 调用识餐接口 → 进入结果页
 */
const diet = useDietStore()
const fileInput = ref<HTMLInputElement>()
const dragging = ref(false)
const loading = ref(false)
const preview = ref('')

function pick() {
  if (!loading.value) fileInput.value?.click()
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  loading.value = true
  try {
    preview.value = await compressImage(file)
    const res = await $fetch<{ ok: boolean; foods: FoodItem[] }>('/api/vision', {
      method: 'POST',
      body: { image: preview.value }
    })
    diet.startAnalysis(preview.value, res.foods)
    navigateTo('/analyze')
  } catch {
    ElMessage.error('识别失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="card !p-0 overflow-hidden cursor-pointer group relative"
    :class="{ 'ring-2 ring-primary-400': dragging }"
    @click="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onChange" />
    <div class="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
      <div
        class="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-3xl transition-transform group-hover:scale-105"
        :class="{ 'animate-bounce': loading }"
      >
        📷
      </div>
      <template v-if="!loading">
        <p class="font-semibold">拍一张或上传餐盘照片</p>
        <p class="text-sm text-slate-400">AI 自动识别菜品、估算份量与营养 · 支持拖拽</p>
      </template>
      <template v-else>
        <p class="font-semibold text-primary-600">AI 正在识别…</p>
        <div class="w-full max-w-xs h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full w-1/3 rounded-full bg-primary animate-[slide_1.2s_ease-in-out_infinite]" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
</style>
