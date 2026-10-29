<script setup lang="ts">
/**
 * AI 自定义弹窗：口味偏好 + 需求描述 + 忌口 → /api/customize 生成个性化方案。
 * 首页（本人）与家庭模式（成员）共用。
 */
import type { CustomPref } from '~/types/recommend'

const props = defineProps<{
  population: string
  age?: number
  existing?: CustomPref | null
}>()
const emit = defineEmits<{ save: [pref: CustomPref] }>()

const FLAVOR_OPTIONS = ['清淡', '辣', '麻', '甜', '酸', '咸鲜', '酱香', '香辣']

const open = defineModel<boolean>('open', { default: false })
const flavors = ref<string[]>([])
const needs = ref('')
const taboos = ref('')
const loading = ref(false)
const result = ref<CustomPref | null>(null)

watch(open, (v) => {
  if (v) {
    flavors.value = [...(props.existing?.flavors ?? [])]
    needs.value = props.existing?.needs ?? ''
    taboos.value = props.existing?.taboos ?? ''
    result.value = props.existing?.summary ? props.existing : null
  }
})

function toggleFlavor(f: string) {
  const i = flavors.value.indexOf(f)
  if (i >= 0) flavors.value.splice(i, 1)
  else flavors.value.push(f)
}

async function generate() {
  if (!needs.value.trim() && !taboos.value.trim() && !flavors.value.length) {
    ElMessage.warning('至少填写一项：口味、需求或忌口')
    return
  }
  loading.value = true
  try {
    result.value = await $fetch<CustomPref>('/api/customize', {
      method: 'POST',
      body: { population: props.population, age: props.age, flavors: flavors.value, needs: needs.value, taboos: taboos.value }
    })
  } catch {
    ElMessage.error('AI 生成失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function save() {
  const pref: CustomPref = {
    flavors: flavors.value,
    needs: needs.value,
    taboos: taboos.value,
    summary: result.value?.summary,
    goodFor: result.value?.goodFor,
    avoid: result.value?.avoid,
    tips: result.value?.tips
  }
  emit('save', pref)
  open.value = false
  ElMessage.success('AI 自定义方案已保存，推荐会实时生效')
}
</script>

<template>
  <el-dialog v-model="open" title="✨ AI 自定义我的饮食方案" width="560px" append-to-body>
    <div class="space-y-4 text-sm">
      <!-- 口味偏好 -->
      <div>
        <p class="font-semibold mb-2">口味偏好（可多选）</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="f in FLAVOR_OPTIONS"
            :key="f"
            class="chip border transition-colors"
            :class="flavors.includes(f) ? 'bg-primary-500 text-white !border-primary-500' : 'bg-white text-slate-500 border-slate-200 hover:border-primary-300'"
            @click="toggleFlavor(f)"
          >
            {{ f }}
          </button>
        </div>
      </div>

      <!-- 需求描述 -->
      <div>
        <p class="font-semibold mb-2">需求描述（想让 AI 怎么照顾你）</p>
        <el-input
          v-model="needs"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="例如：想控糖但爱吃辣、最近健身想多补蛋白、午餐要在公司吃方便携带…"
        />
      </div>

      <!-- 忌口 -->
      <div>
        <p class="font-semibold mb-2">忌口 / 过敏 / 不爱吃</p>
        <el-input
          v-model="taboos"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="例如：不吃香菜、海鲜过敏、不吃内脏、怕腥（顿号/逗号分隔，推荐会自动避开）"
        />
      </div>

      <!-- AI 结果 -->
      <div v-if="loading" class="rounded-lg bg-slate-50 p-4 text-center text-slate-400 animate-pulse">
        AI 营养师正在为你定制方案…
      </div>
      <div v-else-if="result" class="rounded-lg bg-primary-50/60 p-4 space-y-2.5">
        <p class="text-slate-700 leading-relaxed"><b>方案摘要：</b>{{ result.summary }}</p>
        <div v-if="result.goodFor?.length">
          <p class="text-xs font-semibold text-emerald-600 mb-1">✓ 宜吃</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="g in result.goodFor" :key="g" class="chip bg-emerald-50 text-emerald-600">{{ g }}</span>
          </div>
        </div>
        <div v-if="result.avoid?.length">
          <p class="text-xs font-semibold text-red-500 mb-1">✕ 忌口/慎吃</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="a in result.avoid" :key="a" class="chip bg-red-50 text-red-500">{{ a }}</span>
          </div>
        </div>
        <div v-if="result.tips?.length">
          <p class="text-xs font-semibold text-amber-600 mb-1">💡 注意</p>
          <p class="text-xs text-slate-500 leading-relaxed">{{ result.tips.join('；') }}</p>
        </div>
        <p class="text-[11px]" :class="result.source === 'glm' ? 'text-primary-600' : 'text-slate-400'">
          {{ result.source === 'glm' ? '由 GLM 营养师生成' : '规则版（配置 AI Key 后体验完整版）' }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <button class="btn-secondary flex-1" :disabled="loading" @click="generate">
          {{ loading ? '生成中…' : result ? '🔄 重新生成' : '🧑‍⚕️ AI 生成方案' }}
        </button>
        <button class="btn-primary flex-1" :disabled="!flavors.length && !needs.trim() && !taboos.trim()" @click="save">
          保存并生效
        </button>
      </div>
    </template>
  </el-dialog>
</template>
