// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  buildDir: '.nuxt-fresh',
  compatibilityDate: '2026-10-27',
  // 纯 SPA 模式：营养分析工具重交互轻 SEO，关闭 SSR 简化部署
  ssr: false,
  devtools: { enabled: false },
  vite: { optimizeDeps: { exclude: ['lodash-es', 'echarts', 'vue-echarts'] } },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@element-plus/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '食刻 AI · 你的 AI 营养分析师',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '拍一张餐盘照片，AI 营养师告诉你吃了什么、营养如何、下一餐怎么吃。' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  elementPlus: { importStyle: 'css' }
})
