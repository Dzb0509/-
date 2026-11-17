/**
 * 统一读取本地档案，保证刷新页面、打开新标签页或切换用户后，
 * 首页、周报、对话和「我的」使用同一份最新的每日营养目标。
 */
import { DIET_STORAGE_KEY } from '~/stores/diet'

export default defineNuxtPlugin(() => {
  const diet = useDietStore()

  // Nuxt 应用启动时以 localStorage 为准，避免旧页面状态覆盖已保存的用户档案。
  diet.syncFromStorage()

  const sync = (event: StorageEvent) => {
    if (event.key !== DIET_STORAGE_KEY) return
    diet.syncFromStorage()
  }

  window.addEventListener('storage', sync)
})
