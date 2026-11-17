import assert from 'node:assert/strict'
import fs from 'node:fs'
import { transform } from 'esbuild'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'

const root = new URL('../', import.meta.url)
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }

for (const file of ['server/api/vision.post.ts', 'server/api/comment.post.ts', 'server/api/report.post.ts', 'stores/diet.ts', 'types/diet.ts', 'types/taste.ts']) {
  await transform(read(file), { loader: 'ts', format: 'esm', target: 'es2022', logLevel: 'silent' })
  check(true, `${file} TypeScript syntax`)
}

for (const file of ['app.vue', 'components/FoodCard.vue', 'pages/index.vue', 'pages/family.vue', 'pages/report.vue', 'pages/login.vue', 'pages/onboarding.vue', 'pages/profile.vue', 'pages/analyze.vue']) {
  const source = read(file)
  const parsed = parse(source, { filename: file })
  check(parsed.errors.length === 0, `${file} SFC parse`)
  if (parsed.descriptor.scriptSetup) compileScript(parsed.descriptor, { id: file })
  if (parsed.descriptor.template) {
    const template = compileTemplate({ source: parsed.descriptor.template.content, filename: file, id: file })
    check(template.errors.length === 0, `${file} template compile`)
  }
}

const store = read('stores/diet.ts')
check(store.includes('invalidateRecommendations()'), 'record changes invalidate recommendation cache')
check(store.includes('syncFromStorage()'), 'cross-tab storage sync exists')
check(store.includes('Number.isFinite'), 'daily goals tolerate legacy numeric values')
check(store.includes('todayOverview()'), 'today totals and daily goals share one overview snapshot')
check(store.includes('this.activeUserId = active.id'), 'storage sync repairs stale active user IDs')
check(store.includes('RECOMMENDATION_CACHE_VERSION = 3'), 'stale recommendation cache is invalidated')
check(store.includes('region: dish.region'), 'recommended dishes retain cuisine')
check(store.includes('菜系:${f.region}'), 'taste profile learns cuisine')
check(store.includes('async registerAccount(account: string, password: string)'), 'local account registration exists')
check(store.includes('completeOnboarding(data: Pick<UserProfile'), 'first-use onboarding persists profile')
check(store.includes("confirmPending(meal: FoodRecord['meal'] = guessMeal())"), 'recognition result can save an explicit meal')

const vision = read('server/api/vision.post.ts')
check(vision.includes('region'), 'vision prompt and parser include cuisine')

const recommend = read('server/api/recommend.post.ts')
check(recommend.includes('放宽“本次不重复”约束'), 'recommendation refresh has a non-empty fallback')

const card = read('components/FoodCard.vue')
check(card.includes('v-model="food.region"'), 'food confirmation can edit region or flavor')

const chat = read('components/ChatPanel.vue')
check(chat.includes('function persistChat()'), 'chat history has an explicit persistence path')
check(chat.includes('const reply = messages.value[messages.value.length - 1]'), 'chat streams into a reactive message proxy')
check(chat.includes('persistChat()'), 'chat persists the final assistant reply')

const profileLogout = read('pages/profile.vue')
check(profileLogout.includes('router.replace(\'/login\')'), 'logout replaces the authenticated route')
check(profileLogout.includes('loggingOut'), 'logout button prevents duplicate clicks')

const index = read('pages/index.vue')
check(index.includes('watch(() => diet.syncVersion'), 'homepage refreshes after records sync')
check(index.includes('diet.cachePlan(planKey(), updated)'), 'homepage meal refresh persists the new plan')
check(index.includes('hasCompleteMeals'), 'homepage ignores incomplete cached meal plans')
check(index.includes('timeout: 15000'), 'homepage refresh reports stalled requests')
check(index.includes('以原始输入作为缓存指纹'), 'custom recommendation cache uses raw inputs')

const customDialog = read('components/CustomPrefDialog.vue')
check(customDialog.includes('generatedInputKey'), 'custom AI result is tied to its input snapshot')
check(customDialog.includes('generated?.summary'), 'stale custom summary is not saved with changed inputs')

check(recommend.includes('function needScore'), 'rule recommendations score natural-language custom needs')
check(recommend.includes('body.custom.flavors.join'), 'GLM recommendation prompt includes selected flavors')

const authMiddleware = read('middleware/auth.global.ts')
check(authMiddleware.includes('diet.isAuthenticated'), 'global auth middleware protects pages')

const profile = read('pages/profile.vue')
check(profile.includes('aria-label="切换要编辑的用户"'), 'basic profile info has user switcher')
check(profile.includes(':value="diet.todayOverview.totals.kcal"'), 'profile goals card reflects today totals')

const family = read('pages/family.vue')
check(family.includes('diet.cachePlan(planKey(), updated)'), 'family meal refresh persists the new plan')
check(family.includes('timeout: 20000'), 'family refresh reports stalled requests')

const analyze = read('pages/analyze.vue')
check(analyze.includes('记录到哪一餐'), 'recognition result exposes meal selector')

const dietSync = read('plugins/diet-sync.client.ts')
check(dietSync.includes('diet.syncFromStorage()'), 'diet store syncs on app startup')
check(dietSync.includes("addEventListener('storage'"), 'diet store syncs across browser tabs')

console.log(`PASS ${checks} source and template regression checks`)
