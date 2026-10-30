<script setup lang="ts">
const navItems = [
  { to: '/', label: '今日推荐', icon: 'plate' },
  { to: '/family', label: '家庭食谱', icon: 'family' },
  { to: '/explore', label: '地方特色', icon: 'explore' },
  { to: '/record', label: '饮食记录', icon: 'record' },
  { to: '/chat', label: 'AI 营养师', icon: 'chat' },
  { to: '/report', label: '周报', icon: 'report' },
  { to: '/profile', label: '我的', icon: 'profile' }
]
</script>

<template>
  <div class="flex min-h-screen">
    <!-- 桌面侧边栏 -->
    <aside class="hidden md:flex flex-col w-60 shrink-0 border-r border-slate-100 bg-white px-4 py-6 sticky top-0 h-screen overflow-y-auto">
      <NuxtLink to="/" class="flex items-center gap-2.5 px-2 mb-8">
        <span class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-xl">🥗</span>
        <span class="text-lg font-bold tracking-tight">食刻 AI</span>
      </NuxtLink>
      <nav class="flex flex-col gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-primary-50 hover:text-primary-700 transition-colors"
          exact-active-class="!bg-primary-50 !text-primary-700"
        >
          <NavIcon :name="item.icon" class="w-5 h-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <p class="mt-auto px-2 text-[11px] leading-relaxed text-slate-400">
        本应用提供的所有内容均为营养参考建议，不构成医疗诊断。
      </p>
    </aside>

    <!-- 主内容区（PC 宽幅） -->
    <main class="flex-1 min-w-0 pb-20 md:pb-0">
      <div class="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <slot />
      </div>
    </main>

    <!-- AI 悬浮小助手（全站右下角） -->
    <AiMascot />

    <!-- 移动端底部导航（兼容小屏） -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 flex pb-[env(safe-area-inset-bottom)]">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-slate-400"
        exact-active-class="!text-primary-600"
      >
        <NavIcon :name="item.icon" class="w-6 h-6" />
        {{ item.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
