/**
 * 对 .webimg-todo.json 里的菜做一轮免费重试：
 * - 换检索词变体（核心名 / 家常做法 / 菜名 无修饰）
 * - 质检用核心名（网络图是核心菜的成品，修饰词不影响展示）
 * 成功的移出 todo 加入 done，仍失败的保留 todo。
 * 用法: node scripts/retry-todo.mjs
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
const coreName = (name) => name.replace(/[（(][^）)]*[）)]/g, '').replace(/^(少油|改良|无刺软嫩|补铁餐)/, '').trim() || name
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

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

const doneFile = path.join(process.cwd(), 'scripts', '.webimg-done.json')
const todoFile = path.join(process.cwd(), 'scripts', '.webimg-todo.json')
const done = new Set(JSON.parse(fs.readFileSync(doneFile, 'utf8')))
let todo = JSON.parse(fs.readFileSync(todoFile, 'utf8'))
console.log(`todo 共 ${todo.length} 项，开始重试…`)

const stillTodo = []
let recovered = 0
for (const item of todo) {
  const name = typeof item === 'string' ? item : item.name
  const core = coreName(name)
  const jpgFile = path.join(IMG_DIR, `${slugOf(name)}.jpg`)
  const queries = [`${core} 家常菜`, `${core} 菜品图片`, core]
  let ok = false
  for (const q of queries) {
    const urls = await bingSearch(q)
    for (const u of urls) {
      const raw = await download(u)
      if (!raw) continue
      let jpg
      try {
        jpg = await sharp(raw).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
      } catch {
        continue
      }
      if (await visionCheck(core, jpg)) {
        fs.writeFileSync(jpgFile, jpg)
        ok = true
        recovered++
        console.log(`✓ ${name}（${q}）`)
        break
      }
      await sleep(1100)
    }
    if (ok) break
    await sleep(800)
  }
  if (ok) {
    done.add(name)
  } else {
    stillTodo.push(typeof item === 'string' ? { name, note: '重试仍无合格图' } : item)
    console.log(`✗ ${name} 仍无合格图`)
  }
  if (recovered % 5 === 0 && recovered > 0) {
    fs.writeFileSync(doneFile, JSON.stringify([...done]))
  }
  await sleep(2000)
}
fs.writeFileSync(doneFile, JSON.stringify([...done]))
fs.writeFileSync(todoFile, JSON.stringify(stillTodo, null, 2))
console.log(`重试完成：救回 ${recovered} 张，仍剩 ${stillTodo.length} 张待 AI 生成`)
