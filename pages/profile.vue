<script setup lang="ts">
/**
 * 个人档案：基本信息 + 目标 → 每日营养目标自动计算
 */
const diet = useDietStore()
const form = reactive({ ...diet.profile })

const goalOptions = [
  { value: 'lose', label: '减脂' },
  { value: 'keep', label: '保持' },
  { value: 'gain', label: '增肌' }
]

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
