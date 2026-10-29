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
  try {
    const r = await fetch(`${BASE}/api/dish-image?name=${encodeURIComponent(name)}`)
    if (r.ok) {
      done++
      console.log(`✓ ${name}（${done}/${names.length}）`)
    } else {
      fail++
      console.error(`✗ ${name} HTTP ${r.status}`)
    }
  } catch (e) {
    fail++
    console.error(`✗ ${name}`, e.message)
  }
  await new Promise((r) => setTimeout(r, GAP))
}
console.log(`完成：成功 ${done}，失败 ${fail}`)
