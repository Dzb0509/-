<script setup lang="ts">
definePageMeta({ layout: false })
import { POPULATIONS, POP_GROUPS, type PopulationId } from '~/types/recommend'
const diet = useDietStore()
const router = useRouter()
const population = ref<PopulationId>(diet.profile.population)
const goal = ref(diet.profile.goal)
const healthNotes = ref(diet.profile.healthNotes ?? '')

function finish() {
  diet.completeOnboarding({ population: population.value, goal: goal.value, healthNotes: healthNotes.value.trim() })
  ElMessage.success('已完成定位，开始使用食刻 AI')
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-8">
    <div class="max-w-3xl mx-auto space-y-5">
      <header class="text-center">
        <p class="text-3xl">🥗</p>
        <h1 class="text-2xl font-bold mt-2">先告诉我你的饮食定位</h1>
        <p class="text-sm text-slate-400 mt-1">这些信息会用于推荐和营养目标计算</p>
      </header>
      <section class="card">
        <h2 class="font-semibold mb-1">人物定位</h2>
        <p class="text-xs text-slate-400 mb-4">选择最符合当前用户的一项</p>
        <div class="space-y-4">
          <div v-for="group in POP_GROUPS" :key="group.id">
            <p class="text-xs font-semibold text-slate-500 mb-2">{{ group.emoji }} {{ group.label }}</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button v-for="id in group.options" :key="id" class="rounded-xl border-2 p-3 text-left" :class="population === id ? 'border-primary-400 bg-primary-50' : 'border-slate-100'" @click="population = id">
                <p class="font-semibold text-sm">{{ POPULATIONS.find((item) => item.id === id)?.label }}</p>
                <p class="text-[11px] text-slate-400 mt-1">{{ POPULATIONS.find((item) => item.id === id)?.desc }}</p>
              </button>
            </div>
          </div>
        </div>
      </section>
      <section class="card">
        <h2 class="font-semibold mb-3">你的目标</h2>
        <el-radio-group v-model="goal" class="flex flex-wrap gap-2">
          <el-radio-button value="lose">减脂</el-radio-button>
          <el-radio-button value="keep">保持</el-radio-button>
          <el-radio-button value="gain">增肌</el-radio-button>
        </el-radio-group>
      </section>
      <section class="card">
        <h2 class="font-semibold mb-1">是否有疾病或饮食注意事项</h2>
        <p class="text-xs text-slate-400 mb-3">例如高血压、糖尿病、高血脂、食物过敏、孕期等，没有可留空</p>
        <el-input v-model="healthNotes" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="填写需要额外注意的情况" />
      </section>
      <button class="btn-primary w-full" @click="finish">完成设置，进入首页</button>
    </div>
  </div>
</template>
