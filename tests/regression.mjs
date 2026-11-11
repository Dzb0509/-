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

for (const file of ['app.vue', 'components/FoodCard.vue', 'pages/index.vue', 'pages/family.vue', 'pages/report.vue']) {
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
check(store.includes('region: dish.region'), 'recommended dishes retain cuisine')
check(store.includes('菜系:${f.region}'), 'taste profile learns cuisine')

const vision = read('server/api/vision.post.ts')
check(vision.includes('region'), 'vision prompt and parser include cuisine')

const card = read('components/FoodCard.vue')
check(card.includes('v-model="food.region"'), 'food confirmation can edit region or flavor')

const index = read('pages/index.vue')
check(index.includes('watch(() => diet.syncVersion'), 'homepage refreshes after records sync')

console.log(`PASS ${checks} source and template regression checks`)
