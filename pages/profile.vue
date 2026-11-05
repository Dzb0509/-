<script setup lang="ts">
/**
 * 个人档案：基本信息 + 人群定位 + 目标 → 每日营养目标自动计算 + 口味画像
 */
import { POPULATIONS, POP_GROUPS, type PopulationId } from '~/types/recommend'
import { topEntries } from '~/types/taste'

const diet = useDietStore()
const form = reactive({ ...diet.profile })

const goalOptions = [
  { value: 'lose', label: '减脂' },
  { value: 'keep', label: '保持' },
  { value: 'gain', label: '增肌' }
]

function setPopulation(pop: PopulationId) {
  form.population = pop
  diet.updateProfile({ population: pop })
  ElMessage.success('人群已切换，今日推荐将按此重新生成')
}

const taste = computed(() => ({
  flavors: topEntries(diet.tasteProfile.flavors as Record<string, number>, 6),
  regions: topEntries(diet.tasteProfile.regions, 4),
  ingredients: topEntries(diet.tasteProfile.ingredients, 6)
}))

function save() {
  diet.updateProfile({ ...form })
  ElMessage.success('已保存，营养目标已更新')
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">👤 我的档案</h1>
      <p class="text-sm text-slate-400 mt-1">完善信息后，AI 会据此计算你的每日营养目标</p>
    </header>

    <!-- 目标概览 -->
    <section class="card">
      <h2 class="font-semibold mb-4">每日营养目标</h2>
      <div class="flex flex-col sm:flex-row items-center gap-6">
        <RingChart
          :value="0"
          :max="diet.dailyGoals.kcal"
          label="热量目标"
          unit="kcal"
          :size="140"
        />
        <div class="flex-1 w-full">
          <MacroBars
            :totals="{ protein: 0, fat: 0, carb: 0 }"
            :goals="diet.dailyGoals"
          />
        </div>
      </div>
      <p class="text-[11px] text-slate-400 mt-3">
        基于 Mifflin-St Jeor 公式估算基础代谢，按中等活动系数与你的目标调整；正式版将接入 AI 个性化解读。
      </p>
    </section>

    <!-- 人群定位（两级分组，驱动每日推荐） -->
    <section class="card">
      <h2 class="font-semibold mb-1">人群定位</h2>
      <p class="text-[11px] text-slate-400 mb-4">首页的每日三餐推荐将按你的人群自动调整能量与营养结构</p>
      <div class="space-y-4">
        <div v-for="g in POP_GROUPS" :key="g.id">
          <p class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
            <span class="text-sm">{{ g.emoji }}</span>{{ g.label }}
            <span class="font-normal text-slate-400">· {{ g.desc }}</span>
          </p>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              v-for="pid in g.options"
              :key="pid"
              class="rounded-xl border-2 p-2.5 text-left transition-all"
              :class="form.population === pid ? 'border-primary-400 bg-primary-50/50 ring-1 ring-primary-100' : 'border-slate-100 hover:border-primary-100'"
              @click="setPopulation(pid)"
            >
              <p class="font-semibold text-sm">{{ POPULATIONS.find((p) => p.id === pid)?.label }}</p>
              <p class="text-[11px] text-slate-400">{{ POPULATIONS.find((p) => p.id === pid)?.desc }}</p>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 口味画像 -->
    <section class="card">
      <h2 class="font-semibold mb-1">口味画像</h2>
      <p class="text-[11px] text-slate-400 mb-4">
        AI 从你的 {{ diet.records.length }} 条饮食记录中自动学习（也可在对话页直接告诉 AI 你的忌口与偏好）
      </p>
      <template v-if="taste.flavors.length">
        <div class="space-y-3">
          <div>
            <p class="text-xs font-semibold text-slate-500 mb-1.5">口味偏好</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="f in taste.flavors" :key="f" class="chip bg-primary-50 text-primary-700">{{ f }}</span>
            </div>
          </div>
          <div v-if="taste.regions.length">
            <p class="text-xs font-semibold text-slate-500 mb-1.5">菜系偏好</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="r in taste.regions" :key="r" class="chip bg-amber-50 text-amber-600">{{ r }}</span>
            </div>
          </div>
          <div v-if="taste.ingredients.length">
            <p class="text-xs font-semibold text-slate-500 mb-1.5">常吃食材</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="i in taste.ingredients" :key="i" class="chip bg-slate-100 text-slate-600">{{ i }}</span>
            </div>
          </div>
        </div>
      </template>
      <p v-else class="text-sm text-slate-400">暂无数据 — 记录几餐后这里会自动长出你的画像 🌱</p>
    </section>

    <!-- 基本信息 -->
    <section class="card">
      <h2 class="font-semibold mb-4">基本信息</h2>
      <el-form label-width="80px" label-position="left">
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" maxlength="12" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄">
          <el-input-number v-model="form.age" :min="14" :max="80" />
        </el-form-item>
        <el-form-item label="身高">
          <el-input-number v-model="form.height" :min="120" :max="220" :step="1" />
          <span class="text-sm text-slate-400 ml-2">cm</span>
        </el-form-item>
        <el-form-item label="体重">
          <el-input-number v-model="form.weight" :min="30" :max="150" :step="0.5" />
          <span class="text-sm text-slate-400 ml-2">kg</span>
        </el-form-item>
        <el-form-item label="目标">
          <el-radio-group v-model="form.goal">
            <el-radio-button v-for="g in goalOptions" :key="g.value" :value="g.value">
              {{ g.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <button type="button" class="btn-primary" @click="save">保存</button>
        </el-form-item>
      </el-form>
    </section>

    <DisclaimerBar />
  </div>
</template>
