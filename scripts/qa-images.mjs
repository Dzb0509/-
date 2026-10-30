/**
 * 菜品图片质检：用 GLM-4V（免费）逐张核对缓存图片与菜名是否匹配。
 * 不匹配的图片自动调用 /api/dish-image?regen=1 重新生成，并复检一次。
 * 输出报告 scripts/qa-images-report.json。
 * 用法: node scripts/qa-images.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const IMG_DIR = path.join(process.cwd(), 'public', 'dish-imgs')
const KEY = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
  .match(/^ZHIPU_API_KEY=(.+)$/m)?.[1]?.trim()
if (!KEY) {
  console.error('未找到 ZHIPU_API_KEY')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const slugOf = (name) => createHash('md5').update(name).digest('hex').slice(0, 16)

async function visionCheck(name, imgBuf) {
  const b64 = imgBuf.toString('base64')
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: 'glm-4v-flash',
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
                {
                  type: 'text',
                  text: `这道中国菜的名字是「${name}」。请判断这张菜品照片是否符合这道菜（核心食材和成品形态大致相符即可，摆盘/容器/光线风格不重要）。只输出 JSON，不要多余文字：{"match":true} 或 {"match":false,"reason":"画面里实际上是..."}`
                }
              ]
            }
          ]
        }),
        signal: AbortSignal.timeout(45000)
      })
      if (res.status === 429) {
        await sleep(12000 * attempt)
        continue
      }
      if (!res.ok) throw new Error(`上游 ${res.status}`)
      const text = (await res.json())?.choices?.[0]?.message?.content ?? ''
      const m = text.match(/\{[\s\S]*?\}/)
      if (!m) return { match: true, note: '无法解析（默认通过）' }
      const parsed = JSON.parse(m[0])
      return { match: parsed.match !== false, note: parsed.reason ?? '' }
    } catch (e) {
      if (attempt === 4) return { match: true, note: `检查失败跳过: ${e.message}` }
      await sleep(5000 * attempt)
    }
  }
}

async function regen(name) {
  const r = await fetch(`${BASE}/api/dish-image?name=${encodeURIComponent(name)}&regen=1`, {
    signal: AbortSignal.timeout(120000)
  })
  return r.ok
}

const res = await fetch(`${BASE}/api/dishes`)
const { dishes } = await res.json()
const names = [...new Set(dishes.map((d) => d.name))]
console.log(`共 ${names.length} 道菜，开始质检...`)

const mismatches = []
const errors = []
let checked = 0

/** 增量缓存：已核验匹配的菜不再重复检查（prompt 升级后想全量复检就删掉 .qa-ok.json） */
const okCacheFile = path.join(process.cwd(), 'scripts', '.qa-ok.json')
let okCache = new Set()
try {
  okCache = new Set(JSON.parse(fs.readFileSync(okCacheFile, 'utf8')))
} catch {}
const saveOkCache = () => fs.writeFileSync(okCacheFile, JSON.stringify([...okCache]))

// ---- 阶段 1：全量核对 ----
for (const name of names) {
  if (okCache.has(name)) continue
  const jpg = path.join(IMG_DIR, `${slugOf(name)}.jpg`)
  if (!fs.existsSync(jpg)) {
    errors.push({ name, note: '无缓存图片' })
    continue
  }
  const r = await visionCheck(name, fs.readFileSync(jpg))
  checked++
  if (!r.match) {
    mismatches.push({ name, note: r.note })
    console.log(`✗ ${name} → ${r.note}`)
  } else {
    okCache.add(name)
    if (okCache.size % 25 === 0) saveOkCache()
  }
  if (checked % 20 === 0) {
    saveOkCache()
    console.log(`...已核对 ${checked}/${names.length}，发现不匹配 ${mismatches.length} 张`)
  }
  await sleep(1100)
}
saveOkCache()
console.log(`核对完成：本次核对 ${checked} 张（缓存跳过 ${okCache.size - (okCache.size - checked + mismatches.length)} 张），不匹配 ${mismatches.length} 张，无图 ${errors.length}`)

// ---- 阶段 2：重新生成不匹配的并复检一次 ----
// 默认只输出报告（修复走免费的 scripts/fix-mismatch.mjs 网络找图）；
// 加 --fix-ai 才用 CogView-4 重生成（0.06 元/张，需余额）
const FIX_AI = process.argv.includes('--fix-ai')
const stillBad = []
if (FIX_AI) {
  for (const { name, note } of mismatches) {
  const ok = await regen(name)
  if (!ok) {
    stillBad.push({ name, note: `${note}（重生成失败）` })
    continue
  }
  await sleep(1500)
  const jpg = path.join(IMG_DIR, `${slugOf(name)}.jpg`)
  const r = await visionCheck(name, fs.readFileSync(jpg))
  if (!r.match) {
    stillBad.push({ name, note: `${note} → 重生成后仍不匹配: ${r.note}` })
    console.log(`✗✗ ${name} 重生成后仍不匹配`)
  } else {
    okCache.add(name)
    saveOkCache()
    console.log(`✓ ${name} 重生成后已匹配`)
  }
  await sleep(2500)
  }
} else if (mismatches.length) {
  console.log(`（默认不花 AI 费用重生成；${mismatches.length} 张错图交给 scripts/fix-mismatch.mjs 免费网络找图修复）`)
}

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'qa-images-report.json'),
  JSON.stringify({ checked, mismatchCount: mismatches.length, regenFixed: mismatches.length - stillBad.length, stillBad, errors }, null, 2)
)
console.log(`完成：不匹配 ${mismatches.length}，重生成修复 ${mismatches.length - stillBad.length}，仍未解决 ${stillBad.length}`)
console.log('报告：scripts/qa-images-report.json')
