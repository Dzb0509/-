<script setup lang="ts">
/**
 * 菜品卡片：点卡片打开详情弹窗（详细图文做法 + 视频跳转 + 营养 + 记录）
 */
import type { Dish } from '~/types/recommend'
import { MEAL_LABELS } from '~/types/diet'

const props = withDefaults(defineProps<{ dish: Dish; meal?: 'breakfast' | 'lunch' | 'dinner' }>(), {
  meal: undefined
})
const emit = defineEmits<{ eat: [dish: Dish] }>()

const diet = useDietStore()
const showDetail = ref(false)
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

/** 做法/视频搜索跳转 */
const videoLinks = computed(() => [
  { label: 'B站 视频教程', icon: '📺', url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(props.dish.name + ' 做法')}` },
  { label: '下厨房 图文菜谱', icon: '📖', url: `https://www.xiachufang.com/search/?keyword=${encodeURIComponent(props.dish.name)}` },
  { label: '抖音 短视频做法', icon: '🎬', url: `https://www.douyin.com/search/${encodeURIComponent(props.dish.name + ' 做法')}` }
])

function eat() {
  eaten.value = true
  emit('eat', props.dish)
  diet.addDish(props.dish, props.meal)
  ElMessage.success(`已记录「${props.dish.name}」到${props.meal ? MEAL_LABELS[props.meal] : '今日'}餐盘 🍽️`)
}
</script>

<template>
  <div
    class="card !rounded-lg !p-4 flex flex-col gap-2.5 cursor-pointer hover:shadow-card-hover transition-shadow"
    @click="showDetail = true"
  >
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

    <div class="flex items-center justify-between mt-auto">
      <span class="text-xs text-primary-600 font-medium">点击查看详细做法 →</span>
      <button class="btn-primary !py-1.5 !text-xs !px-3" @click.stop="eat">
        {{ eaten ? '✓ 已记录' : '吃了它' }}
      </button>
    </div>

    <!-- 详情弹窗（矩形风格） -->
    <el-dialog
      v-model="showDetail"
      :title="dish.name"
      width="640px"
      class="dish-detail-dialog"
      append-to-body
    >
      <div class="space-y-5 text-sm">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="chip bg-primary-50 text-primary-700">{{ dish.region }}</span>
          <span
            v-for="f in dish.flavors"
            :key="f"
            class="chip text-[11px]"
            :class="flavorColors[f] ?? 'bg-slate-100 text-slate-500'"
          >{{ f }}</span>
        </div>

        <p class="text-slate-500 leading-relaxed">{{ dish.highlight }}</p>

        <!-- 营养 -->
        <div class="grid grid-cols-4 gap-2">
          <div class="rounded-md bg-slate-50 p-2.5 text-center">
            <p class="text-lg font-bold text-primary-600 tabular-nums">{{ dish.nutrition.kcal }}</p>
            <p class="text-[11px] text-slate-400">千卡</p>
          </div>
          <div class="rounded-md bg-slate-50 p-2.5 text-center">
            <p class="text-lg font-bold text-sky-600 tabular-nums">{{ dish.nutrition.protein }}g</p>
            <p class="text-[11px] text-slate-400">蛋白质</p>
          </div>
          <div class="rounded-md bg-slate-50 p-2.5 text-center">
            <p class="text-lg font-bold text-amber-600 tabular-nums">{{ dish.nutrition.fat }}g</p>
            <p class="text-[11px] text-slate-400">脂肪</p>
          </div>
          <div class="rounded-md bg-slate-50 p-2.5 text-center">
            <p class="text-lg font-bold text-violet-600 tabular-nums">{{ dish.nutrition.carb }}g</p>
            <p class="text-[11px] text-slate-400">碳水</p>
          </div>
        </div>

        <!-- 图文做法 -->
        <div>
          <p class="font-semibold mb-2">🧺 食材清单</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="i in dish.ingredients" :key="i" class="chip bg-slate-100 text-slate-600 !py-1.5">{{ i }}</span>
          </div>
        </div>
        <div>
          <p class="font-semibold mb-2">👨‍🍳 详细步骤</p>
          <ol class="space-y-2.5">
            <li v-for="(s, i) in dish.steps" :key="i" class="flex gap-2.5 leading-relaxed text-slate-600">
              <span class="shrink-0 w-5 h-5 rounded-md bg-primary-500 text-white text-xs flex items-center justify-center font-bold mt-0.5">{{ i + 1 }}</span>
              {{ s }}
            </li>
          </ol>
        </div>

        <!-- 视频跳转 -->
        <div class="rounded-md bg-slate-50 p-3.5">
          <p class="font-semibold mb-2.5">📺 跟着视频学（站外搜索直达）</p>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="v in videoLinks"
              :key="v.label"
              :href="v.url"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 rounded-md bg-white shadow-card px-3 py-2 text-xs font-medium text-slate-600 hover:text-primary-600 transition-colors"
              @click.stop
            >
              {{ v.icon }} {{ v.label }}
            </a>
          </div>
          <p class="text-[11px] text-slate-400 mt-2">跳转到第三方平台搜索「{{ dish.name }}」的做法视频与图文菜谱</p>
        </div>
      </div>

      <template #footer>
        <button class="btn-primary w-full" :disabled="eaten" @click="eat">
          {{ eaten ? '✓ 已记录到今日餐盘' : '吃了它，记一笔' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
/* 详情弹窗矩形风格（小圆角、直边按钮） */
.dish-detail-dialog .el-dialog {
  border-radius: 8px;
}
.dish-detail-dialog .el-dialog__header {
  border-bottom: 1px solid #f1f5f9;
  margin-right: 0;
  padding-bottom: 14px;
}
.dish-detail-dialog .el-dialog__footer {
  border-top: 1px solid #f1f5f9;
  padding-top: 14px;
}
</style>
