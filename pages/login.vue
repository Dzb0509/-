<script setup lang="ts">
definePageMeta({ layout: false })
const diet = useDietStore()
const router = useRouter()
const isRegister = ref(true)
const account = ref('')
const password = ref('')
const busy = ref(false)

async function submit() {
  if (!account.value.trim() || !password.value) return ElMessage.warning('请输入账号和密码')
  busy.value = true
  const result = isRegister.value
    ? await diet.registerAccount(account.value, password.value)
    : await diet.loginAccount(account.value, password.value)
  busy.value = false
  if (!result.ok) return ElMessage.error(result.message)
  router.push(diet.profile.onboardingComplete ? '/' : '/onboarding')
}
</script>

<template>
  <div class="min-h-screen bg-porcelain flex items-center justify-center px-4 py-8">
    <div class="app-mat w-full max-w-md card !p-7">
      <div class="text-center mb-7">
        <div class="mx-auto w-28 h-20 rounded-md overflow-hidden bg-celadon shadow-card">
          <img
            src="/hero-rainbow.jpg?v=20261117-2"
            alt="食刻彩虹餐盘"
            class="w-full h-full object-cover"
          >
        </div>
        <h1 class="text-2xl font-bold mt-4 text-primary-700">食刻 <em class="not-italic text-tomato">AI</em></h1>
        <p class="text-sm text-slate-400 mt-1">你的 AI 营养分析师</p>
      </div>
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="账号"><el-input v-model="account" maxlength="40" placeholder="输入账号" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="password" type="password" show-password maxlength="80" placeholder="输入密码" @keyup.enter="submit" /></el-form-item>
        <button class="btn-primary w-full" :disabled="busy" @click="submit">{{ busy ? '处理中…' : (isRegister ? '注册并开始' : '登录') }}</button>
      </el-form>
      <button class="w-full text-sm text-primary-600 mt-4 hover:underline" @click="isRegister = !isRegister">
        {{ isRegister ? '已有账号，去登录' : '第一次使用，注册账号' }}
      </button>
      <p class="text-[11px] text-slate-400 text-center mt-5">账号数据保存在当前浏览器中</p>
    </div>
  </div>
</template>
