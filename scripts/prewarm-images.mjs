/**
 * 菜品图片预热脚本：从 /api/dishes 拉全部菜名，串行慢速调 /api/dish-image
 * （CogView-3-Flash 免费模型有 RPM 限流，必须串行 + 间隔），之后页面全部秒开。
 * 用法: node scripts/prewarm-images.mjs [baseUrl] [每次间隔毫秒]
 */
const BASE = process.argv[2] ?? 'http://localhost:3000'
const GAP = Number(process.argv[3] ?? 4000)

const res = await fetch(`${BASE}/api/dishes`)
const { dishes } = await res.json()
const names = [...new Set(dishes.map((d) => d.name))]
console.log(`共 ${names.length} 道菜，开始预热（串行，间隔 ${GAP}ms）...`)

let done = 0
let fail = 0

for (const name of names) {
  const t0 = Date.now()
  try {
    const r = await fetch(`${BASE}/api/dish-image?name=${encodeURIComponent(name)}`)
    const elapsed = Date.now() - t0
    if (r.ok) {
      done++
      console.log(`✓ ${name}（${done}/${names.length}）${elapsed < 2000 ? '' : ' [新生成]'}`)
    } else {
      fail++
      console.error(`✗ ${name} HTTP ${r.status}`)
    }
  } catch (e) {
    fail++
    console.error(`✗ ${name}`, e.message)
  }
  // 缓存命中（秒回）无需限流间隔，只有真正调 CogView 生成时才需要慢速
  const elapsed = Date.now() - t0
  await new Promise((r) => setTimeout(r, elapsed < 2000 ? 200 : GAP))
}
console.log(`完成：成功 ${done}，失败 ${fail}`)
