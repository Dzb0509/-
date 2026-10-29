/**
 * 全库图片重生成（CogView-4）+ GLM-4V 全量复检 + 坏图再修。
 * 背景：免费版 cogview-3-flash 退化严重（随机生成人物/风景），全库换 cogview-4 重生成。
 * 阶段 1：对全部菜名调 /api/dish-image?regen=1（并发 2，断点续跑 .regen-done.json）
 * 阶段 2：GLM-4V 逐张核对，不匹配的再重生成一次并复检
 * 报告：scripts/regen-all-report.json
 * 用法: node scripts/regen-all.mjs [baseUrl]
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

async function regen(name) {
  const r = await fetch(`${BASE}/api/dish-image?name=${encodeURIComponent(name)}&regen=1`, {
    signal: AbortSignal.timeout(180000)
  })
  return r.ok
}

async function visionCheck(name) {
  const jpg = path.join(IMG_DIR, `${slugOf(name)}.jpg`)
  if (!fs.existsSync(jpg)) return { match: false, note: '无缓存图片' }
  const b64 = fs.readFileSync(jpg).toString('base64')
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: 'glm-4v-flash',
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
              { type: 'text', text: `这道中国菜的名字是「${name}」。请判断这张菜品照片是否符合这道菜（核心食材和成品形态大致相符即可，摆盘/容器/光线风格不重要）。只输出 JSON，不要多余文字：{"match":true} 或 {"match":false,"reason":"画面里实际上是..."}` }
            ]
          }]
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

const res = await fetch(`${BASE}/api/dishes`)
const { dishes } = await res.json()
const names = [...new Set(dishes.map((d) => d.name))]
console.log(`共 ${names.length} 道菜，开始全库 CogView-4 重生成...`)

// ---- 阶段 1：全量重生成（并发 2，断点续跑）----
const doneFile = path.join(process.cwd(), 'scripts', '.regen-done.json')
let done = new Set()
try { done = new Set(JSON.parse(fs.readFileSync(doneFile, 'utf8'))) } catch {}
const saveDone = () => fs.writeFileSync(doneFile, JSON.stringify([...done]))

const queue = names.filter((n) => !done.has(n))
console.log(`待重生成 ${queue.length} 张（已完成 ${done.size}）`)
let regenFail = []
let cursor = 0

async function worker(id) {
  while (cursor < queue.length) {
    const name = queue[cursor++]
    let ok = false
    for (let a = 1; a <= 3 && !ok; a++) {
      ok = await regen(name)
      if (!ok) await sleep(15000 * a)
    }
    if (ok) {
      done.add(name)
      console.log(`✓ [w${id}] ${name}（${done.size}/${names.length}）`)
    } else {
      regenFail.push(name)
      console.error(`✗ [w${id}] ${name} 重生成失败（3 次尝试）`)
    }
    if (done.size % 10 === 0) saveDone()
    await sleep(1000)
  }
}
await Promise.all([worker(1), worker(2)])
saveDone()
console.log(`阶段 1 完成：成功 ${done.size}，失败 ${regenFail.length}`)

// ---- 阶段 2：GLM-4V 全量复检 + 坏图再修一轮 ----
console.log('开始阶段 2：全量复检...')
const stillBad = []
let checked = 0
for (const name of names) {
  const r = await visionCheck(name)
  checked++
  if (!r.match) {
    console.log(`✗ ${name} → ${r.note}，重生成修复中...`)
    const ok = await regen(name)
    if (ok) {
      await sleep(1500)
      const r2 = await visionCheck(name)
      if (!r2.match) {
        stillBad.push({ name, note: `${r.note} → 修复后仍不匹配: ${r2.note}` })
        console.log(`✗✗ ${name} 修复后仍不匹配`)
      } else {
        console.log(`✓ ${name} 修复成功`)
      }
    } else {
      stillBad.push({ name, note: `${r.note}（修复生成失败）` })
    }
    await sleep(2500)
  }
  if (checked % 20 === 0) console.log(`...复检 ${checked}/${names.length}，坏图 ${stillBad.length}`)
  await sleep(1100)
}

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'regen-all-report.json'),
  JSON.stringify({ regenDone: done.size, regenFail, checked, stillBad }, null, 2)
)
console.log(`全部完成：复检 ${checked}，仍未解决 ${stillBad.length}`)
console.log('报告：scripts/regen-all-report.json')
