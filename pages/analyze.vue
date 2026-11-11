<script setup lang="ts">
/**
 * 识餐结果页：食物确认修正 → 分阶段 AI 流式点评（含生成式图表卡片）→ 写入记录
 */
const diet = useDietStore()
const router = useRouter()

import { sumNutrition } from '~/types/diet'

const stages = ['视觉识别', '检索膳食指南', '生成点评']
const currentStage = ref(0)

const commentText = ref('')
const commenting = ref(true)
const commentDone = ref(false)
const streamError = ref(false)
const addFoodDialog = ref(false)
const newFood = reactive({
  name: '',
  region: '未标注',
  grams: 100,
  kcal: 100,
  protein: 5,
  fat: 3,
  carb: 12
})

const totals = computed(() => (diet.pending ? sumNutrition(diet.pending.foods) : null))
const foodsRef = computed(() => diet.pending?.foods ?? [])

// 流式点评（骨架阶段 mock；接入智谱后协议不变）
let aborter: AbortController | null = null
async function runComment() {
  aborter?.abort()
  commenting.value = true
  commentDone.value = false
  streamError.value = false
  commentText.value = ''
  aborter = new AbortController()
  try {
    await streamSSE(
      '/api/comment',
      { foods: foodsRef.value },
      (e) => {
        if (e.type === 'stage') currentStage.value = 1
        else if (e.type === 'text') {
          currentStage.value = 2
          commentText.value += e.text ?? ''
        } else if (e.type === 'done') {
          currentStage.value = 3
          commentDone.value = true
          commenting.value = false
        }
      },
      aborter.signal
    )
  } catch {
    streamError.value = true
  } finally {
    commenting.value = false
    if (!streamError.value && commentDone.value) currentStage.value = 3
  }
}

onMounted(() => {
  if (diet.pending) runComment()
})

function retry() {
  currentStage.value = 0
  runComment()
}

function resetNewFood() {
  Object.assign(newFood, { name: '', region: '未标注', grams: 100, kcal: 100, protein: 5, fat: 3, carb: 12 })
}

async function addFood() {
  if (!diet.pending) return
  const name = newFood.name.trim()
  if (!name) {
    ElMessage.warning('请填写菜品名称')
    return
  }
  if (![newFood.grams, newFood.kcal, newFood.protein, newFood.fat, newFood.carb].every((n) => Number.isFinite(n) && n >= 0)) {
    ElMessage.warning('请填写有效的份量和营养值')
    return
  }
  diet.pending.foods.push({
    id: `manual-${Date.now()}`,
    name: name.slice(0, 40),
    region: newFood.region || '未标注',
    grams: Math.min(2000, Math.max(5, Math.round(newFood.grams))),
    confidence: 1,
    per100: {
      kcal: Math.max(0, Number(newFood.kcal)),
      protein: Math.max(0, Number(newFood.protein)),
      fat: Math.max(0, Number(newFood.fat)),
      carb: Math.max(0, Number(newFood.carb))
    }
  })
  addFoodDialog.value = false
  resetNewFood()
  await nextTick()
  // 让点评上下文包含刚补录的菜品，而不是继续使用旧识别列表。
  runComment()
}

function confirm() {
  const record = diet.confirmPending()
  if (record) {
    ElMessage.success('已记录这一餐 🎉')
    router.push('/record')
  } else if (diet.pending) {
    ElMessage.error('保存失败，识别结果已保留，请重试')
  }
}

function backHome() {
  diet.pending = null
  router.push('/record')
}

// 生成式图表卡片：宏量营养素供能占比（点评完成后动态渲染）
const macroOption = computed(() => {
  if (!totals.value) return null
  const { protein, fat, carb } = totals.value
  return {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        label: { formatter: '{b} {d}%', fontSize: 11 },
        data: [
          { name: '蛋白质', value: Math.round(protein * 4), itemStyle: { color: '#3B82F6' } },
          { name: '脂肪', value: Math.round(fat * 9), itemStyle: { color: '#F59E0B' } },
          { name: '碳水', value: Math.round(carb * 4), itemStyle: { color: '#8B5CF6' } }
        ]
      }
    ]
  }
})

onUnmounted(() => aborter?.abort())
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <header class="flex items-center gap-3">
      <button
        class="w-9 h-9 rounded-xl bg-white shadow-card flex items-center justify-center text-slate-500 hover:text-primary-600 transition-colors"
        @click="backHome"
      >
        ←
      </button>
      <div>
        <h1 class="text-xl font-bold">识餐结果</h1>
        <p class="text-xs text-slate-400">确认食物与份量，AI 营养师给出点评（照片仅用于本次识别）</p>
      </div>
    </header>

    <!-- 无待确认结果 -->
    <div v-if="!diet.pending" class="card text-center py-14 space-y-3">
      <p class="text-4xl">🍽️</p>
      <p class="text-slate-500">还没有待确认的识餐结果</p>
      <NuxtLink to="/record" class="btn-primary">去饮食记录页拍照</NuxtLink>
    </div>

    <template v-else>
      <!-- 照片 + 阶段指示 -->
      <section class="card flex flex-col sm:flex-row gap-5 items-center">
        <img
          :src="diet.pending.image"
          alt="餐盘照片"
          class="w-36 h-36 rounded-xl object-cover shrink-0 bg-slate-100"
        />
        <div class="flex-1 w-full space-y-3">
          <StageIndicator :stages="stages" :current="commentDone ? stages.length : Math.min(currentStage, stages.length - 1)" />
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-primary-600 tabular-nums">
              {{ Math.round(totals?.kcal ?? 0) }}
            </span>
            <span class="text-sm text-slate-400">kcal 估算总摄入</span>
          </div>
        </div>
      </section>

      <!-- 食物列表（可修正） -->
      <section class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <h2 class="font-semibold text-sm text-slate-500">识别结果（可修正）</h2>
          <button class="text-xs text-primary-600 hover:underline" @click="addFoodDialog = true">＋手动添加菜品</button>
        </div>
        <FoodCard
          v-for="(f, i) in diet.pending.foods"
          :key="f.id"
          :food="f"
          editable
          @remove="diet.pending!.foods.splice(i, 1)"
        />
      </section>

      <!-- AI 流式点评 -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold flex items-center gap-2">
            <span>🧑‍⚕️</span> AI 营养师点评
          </h2>
          <button
            v-if="streamError"
            class="text-xs text-primary-600 hover:underline"
            @click="retry"
          >
            重新生成
          </button>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 text-sm leading-7 min-h-24 whitespace-pre-wrap">
          <template v-if="commentText">{{ commentText }}<span v-if="commenting" class="animate-pulse text-primary-500">▍</span></template>
          <span v-else-if="streamError" class="text-red-400">点评生成失败，请点击右上角重试。</span>
          <span v-else class="text-slate-400">AI 正在思考…</span>
        </div>

        <!-- 生成式图表卡片 -->
        <div v-if="commentDone && macroOption" class="mt-4 rounded-xl border border-primary-100 bg-primary-50/40 p-4">
          <p class="text-xs font-semibold text-primary-700 mb-2">📊 AI 动态生成 · 供能占比</p>
          <VChart :option="macroOption" autoresize style="height: 200px" />
        </div>
      </section>

      <div class="flex gap-3">
        <button class="btn-primary flex-1" :disabled="commenting" @click="confirm">
          确认无误，记录这一餐
        </button>
        <button class="rounded-xl bg-white shadow-card px-5 font-medium text-slate-500 hover:text-red-500 transition-colors" @click="backHome">
          丢弃
        </button>
      </div>

      <DisclaimerBar />
    </template>

    <el-dialog v-model="addFoodDialog" title="手动添加菜品" width="min(92vw, 520px)" @closed="resetNewFood">
      <el-form label-width="72px" @submit.prevent="addFood">
        <el-form-item label="菜品名称" required>
          <el-input v-model="newFood.name" maxlength="40" show-word-limit placeholder="例如：清炒油麦菜" />
        </el-form-item>
        <el-form-item label="地域/风味">
          <el-input v-model="newFood.region" maxlength="20" placeholder="例如：西餐、日料、东北烧烤、甜点" />
        </el-form-item>
        <el-form-item label="份量">
          <el-input-number v-model="newFood.grams" :min="5" :max="2000" :step="10" />
          <span class="text-xs text-slate-400 ml-2">克</span>
        </el-form-item>
        <p class="text-xs text-slate-400 mb-2 ml-[72px]">以下营养值均填写“每 100 克”</p>
        <div class="grid grid-cols-2 gap-3 ml-[72px]">
          <el-form-item label="热量" label-width="48px"><el-input-number v-model="newFood.kcal" :min="0" :max="2000" :step="1" /></el-form-item>
          <el-form-item label="蛋白质" label-width="60px"><el-input-number v-model="newFood.protein" :min="0" :max="200" :step="0.1" /></el-form-item>
          <el-form-item label="脂肪" label-width="48px"><el-input-number v-model="newFood.fat" :min="0" :max="200" :step="0.1" /></el-form-item>
          <el-form-item label="碳水" label-width="48px"><el-input-number v-model="newFood.carb" :min="0" :max="300" :step="0.1" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="addFoodDialog = false">取消</el-button>
        <el-button type="primary" @click="addFood">添加并重新点评</el-button>
      </template>
    </el-dialog>
  </div>
</template>
