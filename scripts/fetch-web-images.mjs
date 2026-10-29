/**
 * 从必应图片搜索找菜品成品图（免费）+ GLM-4V 质检，通过则落盘本地缓存。
 * 搜不到 / 质检不通过的菜记入 .webimg-todo.json（留给 CogView-4 生成）。
 * 质检标准：是这道菜的成品照片、食物特写、无文字水印、无人物无关物。
 * 用法: node scripts/fetch-web-images.mjs [baseUrl] [--limit N]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit')
  return i > -1 ? Number(process.argv[i + 1]) : Infinity
})()
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

/** 必应图片搜索：返回原图 URL 列表 */
async function bingSearch(query) {
  const url = `https://cn.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return []
    const html = await res.text()
    const urls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map((m) => m[1])
    return [...new Set(urls)].slice(0, 10)
  } catch {
    return []
  }
}

/** 下载图片（跳过太小/非图片） */
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
    return buf.length > 20000 ? buf : null // <20KB 的多是缩略图/占位图
  } catch {
    return null
  }
}

async function visionCheck(name, imgBuf) {
  const b64 = imgBuf.toString('base64')
  for (let attempt = 1; attempt <= 3; attempt++) {
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
              { type: 'text', text: `这道中国菜的名字是「${name}」。这张图适合作为该菜的封面图吗？要求：①画面主体确实是这道菜（核心食材相符）②成品菜的食物特写 ③画面上没有文字/水印/Logo ④没有人物或无关物体。全部满足才合格。只输出 JSON：{"ok":true} 或 {"ok":false,"reason":"..."}。` }
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
      if (!m) return false
      return JSON.parse(m[0]).ok === true
    } catch {
      if (attempt === 3) return false
      await sleep(5000 * attempt)
    }
  }
  return false
}

const res = await fetch(`${BASE}/api/dishes`)
const { dishes } = await res.json()
let names = [...new Set(dishes.map((d) => d.name))]

// 断点续跑：已完成的跳过；CogView-4 已重生成的（.regen-done.json）视为好图跳过
const doneFile = path.join(process.cwd(), 'scripts', '.webimg-done.json')
const todoFile = path.join(process.cwd(), 'scripts', '.webimg-todo.json')
let done = new Set()
let todo = []
let aiDone = new Set()
try { done = new Set(JSON.parse(fs.readFileSync(doneFile, 'utf8'))) } catch {}
try { todo = JSON.parse(fs.readFileSync(todoFile, 'utf8')) } catch {}
try { aiDone = new Set(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', '.regen-done.json'), 'utf8'))) } catch {}

names = names.filter((n) => !done.has(n) && !aiDone.has(n) && !todo.some((t) => t.name === n)).slice(0, LIMIT)
console.log(`本批处理 ${names.length} 道菜（AI 好图跳过 ${aiDone.size}，已完成 ${done.size}，已列 todo ${todo.length}）`)

let found = 0
const save = () => {
  fs.writeFileSync(doneFile, JSON.stringify([...done]))
  fs.writeFileSync(todoFile, JSON.stringify(todo, null, 2))
}

for (const name of names) {
  const jpgFile = path.join(IMG_DIR, `${slugOf(name)}.jpg`)
  const query = `${coreName(name)} 菜 成品`
  const urls = await bingSearch(query)
  let ok = false
  for (const u of urls) {
    const raw = await download(u)
    if (!raw) continue
    let jpg
    try {
      jpg = await sharp(raw).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
    } catch {
      continue // sharp 解不了的不是正常图片
    }
    if (await visionCheck(name, jpg)) {
      fs.writeFileSync(jpgFile, jpg)
      ok = true
      found++
      console.log(`✓ ${name}（网络图 #${urls.indexOf(u) + 1}）`)
      break
    }
    await sleep(1100)
  }
  if (!ok) {
    todo.push({ name, note: '必应无合格图' })
    console.log(`✗ ${name} → todo`)
  }
  done.add(name)
  if (done.size % 5 === 0) save()
  await sleep(2000)
}
save()
console.log(`完成：本批 ${names.length}，网络图命中 ${found}，待 AI 生成 ${todo.length} 累计`)
