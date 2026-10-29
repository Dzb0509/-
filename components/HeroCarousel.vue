<script setup lang="ts">
/**
 * 首页 Hero 轮播：图文卡片自动循环播放（JS 定时器），
 * 图片走 /api/dish-image（CogView 生成 + 本地缓存），支持圆点切换与 hover 暂停。
 */
const slides = [
  {
    emoji: '🌈',
    title: '彩虹餐盘法则',
    text: '每餐凑齐 5 种颜色：红番茄、绿青菜、黄玉米、白鱼肉、黑木耳。颜色越丰富，植化素越全面，一顿饭就是一幅画。',
    img: '彩虹蔬菜沙拉餐盘'
  },
  {
    emoji: '🧂',
    title: '高血压人群的控钠技巧',
    text: '限盐勺从 5g 开始；用香醋、柠檬、葱姜蒜提味代替一半盐；出锅前才放盐，咸味留在表面，减盐不减味。',
    img: '清蒸蔬菜拼盘健康餐'
  },
  {
    emoji: '🥩',
    title: '优质蛋白怎么选',
    text: '鱼虾贝 > 禽肉 > 畜肉，蛋奶豆天天有。每餐一掌心的量，分散到三餐比一餐吃够更利于吸收。',
    img: '香煎鸡胸肉西兰花餐'
  },
  {
    emoji: '🍚',
    title: '控糖先换主食',
    text: '白米饭掺 1/3 杂粮，血糖曲线更平稳；先吃菜再吃肉最后吃主食，餐后血糖能少爬一个坡。',
    img: '杂粮饭糙米饭健康主食'
  }
]

const current = ref(0)
const paused = ref(false)
const imgOk = ref(slides.map(() => true))
let timer: ReturnType<typeof setInterval> | null = null

function go(i: number) {
  current.value = (i + slides.length) % slides.length
}

onMounted(() => {
  timer = setInterval(() => {
    if (!paused.value) go(current.value + 1)
  }, 5000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-lg shadow-card select-none"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <div
      class="flex transition-transform duration-700 ease-out"
      :style="{ transform: `translateX(-${current * 100}%)` }"
    >
      <article
        v-for="(s, i) in slides"
        :key="i"
        class="w-full shrink-0 grid grid-cols-1 md:grid-cols-2"
        style="min-height: 220px"
      >
        <!-- 文案区 -->
        <div class="flex flex-col justify-center gap-2 p-7 bg-gradient-to-br from-primary-600 to-primary-500 text-white">
          <span class="text-3xl">{{ s.emoji }}</span>
          <h3 class="text-xl font-bold">{{ s.title }}</h3>
          <p class="text-sm leading-relaxed text-white/90">{{ s.text }}</p>
          <span class="text-[11px] text-white/60 mt-1">食刻营养小课堂 {{ i + 1 }}/{{ slides.length }} · 每 5 秒自动播放</span>
        </div>
        <!-- 图片区（真实菜品图，生成失败回退渐变） -->
        <div class="hidden md:block relative bg-primary-50">
          <img
            v-if="imgOk[i]"
            :src="`/api/dish-image?name=${encodeURIComponent(s.img)}`"
            :alt="s.title"
            class="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            @error="imgOk[i] = false"
          >
          <div v-else class="absolute inset-0 flex items-center justify-center text-6xl bg-gradient-to-br from-primary-100 to-primary-200">
            {{ s.emoji }}
          </div>
        </div>
      </article>
    </div>

    <!-- 圆点指示器 -->
    <div class="absolute bottom-3 right-4 flex gap-1.5">
      <button
        v-for="(s, i) in slides"
        :key="i"
        class="w-2 h-2 rounded-full transition-all"
        :class="current === i ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/80'"
        :aria-label="`切换到第${i + 1}张`"
        @click="go(i)"
      />
    </div>
  </section>
</template>
