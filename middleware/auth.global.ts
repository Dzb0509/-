export default defineNuxtRouteMiddleware((to) => {
  const diet = useDietStore()
  if (to.path === '/login') {
    if (diet.isAuthenticated && !diet.profile.onboardingComplete) return navigateTo('/onboarding')
    if (diet.isAuthenticated) return navigateTo('/')
    return
  }
  if (!diet.isAuthenticated) return navigateTo('/login')
  if (!diet.profile.onboardingComplete && to.path !== '/onboarding') return navigateTo('/onboarding')
  if (diet.profile.onboardingComplete && to.path === '/onboarding') return navigateTo('/')
})
