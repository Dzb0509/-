/**
 * 修复质检报告里的错图：读取 qa-images-report.json 的 mismatches，
 * 对每张用多组检索词重搜网络图，过「双关卡」质检（glm-4v-flash 两次独立提问都通过）才替换。
 * 全程免费；替换失败的菜保留旧图并输出到 scripts/fix-mismatch-left.json。
 * 用法: node scripts/fix-mismatch.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const IMG_DIR = path.join(process.cwd(), 'public', 'dish-imgs')
const KEY = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
  .match(/^ZHIPU_API_KEY=(.+)$/m)?.[1]?.trim()
if (!KEY) {
  console.error('未找到 ZHIPU_API_KEY')
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const slugOf = (name) => createHash('md5').update(name).digest('hex').slice(0, 16)
const coreName = (name) => name.replace(/[（(][^）)]*[）)]/g, '').trim() || name
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

async function bingSearch(query) {
  const url = `https://cn.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return []
    const html = await res.text()
    const urls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map((m) => m[1])
    return [...new Set(urls)].slice(0, 12)
  } catch {
    return []
  }
}

async function download(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://cn.bing.com/' },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > 20000 ? buf : null
  } catch {
    return null
  }
}

/** 裁掉四边 12%（水印/Logo 几乎都在角落）再缩放到 512 JPEG */
async function toCleanJpg(raw) {
  const meta = await sharp(raw).metadata()
  const w = Math.floor(meta.width * 0.76)
  const h = Math.floor(meta.height * 0.76)
  return sharp(raw)
    .extract({ left: Math.floor(meta.width * 0.12), top: Math.floor(meta.height * 0.12), width: w, height: h })
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 82 })
    .toBuffer()
}

/** 双关卡质检：两个独立角度的提问都通过才收 */
async function strictCheck(core, imgBuf) {
  const b64 = imgBuf.toString('base64')
  const prompts = [
    // 关卡 1：这道菜本体检查
    `这道中国菜叫「${core}」。请仔细看图回答：照片里的食物主体是否就是这个菜（核心食材与成品形态相符）？注意排除：别的菜、生的食材、步骤过程图、菜单封面。只输出 JSON：{"ok":true} 或 {"ok":false,"reason":"画面里实际是..."}`,
    // 关卡 2：干净度检查（反水印/反无关物）
    `看这张照片，逐项检查：①仔细看画面四角和边缘，有没有任何文字、数字、水印、Logo、二维码（哪怕很小的半透明字）？②有没有人物、人脸、手？③主体是不是一盘/一碗做好的成品菜（而不是风景、建筑、动物、人物或截图）？全部符合才输出 {"ok":true}，否则 {"ok":false,"reason":"..."}`
  ]
  for (const q of prompts) {
    let ok = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
          body: JSON.stringify({
            model: 'glm-4v-flash',
            temperature: 0.1,
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
              { type: 'text', text: q }
            ] }]
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
        if (!m) break // 解析失败视为不过，宁可错杀
        ok = JSON.parse(m[0]).ok === true
        break
      } catch {
        if (attempt === 3) break
        await sleep(5000 * attempt)
      }
    }
    if (!ok) return false
    await sleep(900)
  }
  return true
}

// 优先用 --list 指定的菜名清单（用户点名重换）；否则用 .qa-ok.json 反推质检错图
const listIdx = process.argv.indexOf('--list')
let mismatches
if (listIdx > -1) {
  mismatches = JSON.parse(fs.readFileSync(path.resolve(process.argv[listIdx + 1]), 'utf8'))
    .map((n) => ({ name: typeof n === 'string' ? n : n.name, note: '用户点名重换' }))
} else {
  const reportFile = path.join(process.cwd(), 'scripts', 'qa-images-report.json')
  const okCacheFile = path.join(process.cwd(), 'scripts', '.qa-ok.json')
  if (!fs.existsSync(okCacheFile)) {
    console.error('未找到 .qa-ok.json，先跑 qa-images.mjs 全量质检')
    process.exit(1)
  }
  // qa-images-report.json 未保存 mismatches 明细，用 .qa-ok.json 反推：不在通过名单里的即错图
  const okCache = new Set(JSON.parse(fs.readFileSync(okCacheFile, 'utf8')))
  const { dishes } = await (await fetch('http://localhost:3000/api/dishes')).json()
  const notes = fs.existsSync(reportFile)
    ? Object.fromEntries((JSON.parse(fs.readFileSync(reportFile, 'utf8')).stillBad ?? []).map((x) => [x.name, x.note]))
    : {}
  mismatches = [...new Set(dishes.map((d) => d.name))]
    .filter((n) => !okCache.has(n))
    .map((name) => ({ name, note: notes[name] ?? '质检未通过' }))
}
console.log(`待修复 ${mismatches.length} 张错图`)

const left = []
let fixed = 0
for (const { name, note } of mismatches) {
  const core = coreName(name)
  const jpgFile = path.join(IMG_DIR, `${slugOf(name)}.jpg`)
  const queries = [
    `${core} 成品 菜`,
    `${core} 家常菜 做法`,
    `${core} 美食 图片`,
    core
  ]
  let ok = false
  outer: for (const q of queries) {
    const urls = await bingSearch(q)
    for (const u of urls) {
      const raw = await download(u)
      if (!raw) continue
      let jpg
      try {
        jpg = await toCleanJpg(raw)
      } catch {
        continue
      }
      if (await strictCheck(core, jpg)) {
        fs.writeFileSync(jpgFile, jpg)
        ok = true
        fixed++
        console.log(`✓ ${name} 已替换（${q} #${urls.indexOf(u) + 1}）〔原图问题: ${note}〕`)
        break outer
      }
      await sleep(1100)
    }
    await sleep(800)
  }
  if (!ok) {
    left.push({ name, note })
    console.log(`✗ ${name} 未找到更好的替换图，保留原图`)
  }
  if (fixed % 5 === 0 && fixed > 0) {
    fs.writeFileSync(path.join(process.cwd(), 'scripts', 'fix-mismatch-left.json'), JSON.stringify(left, null, 2))
  }
  await sleep(1800)
}
fs.writeFileSync(path.join(process.cwd(), 'scripts', 'fix-mismatch-left.json'), JSON.stringify(left, null, 2))
console.log(`修复完成：替换 ${fixed} 张，未解决 ${left.length} 张（见 scripts/fix-mismatch-left.json）`)
