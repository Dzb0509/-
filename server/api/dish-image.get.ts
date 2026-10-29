import { defineEventHandler, getQuery, send, setResponseStatus, setHeader } from 'h3'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 菜品真实图片：按菜名用智谱 CogView-3-Flash（免费）生成真实感菜品照片。
 * 直接返回 PNG 二进制，可作 <img src> 使用（ DishCard / HeroCarousel）。
 * 首次生成后落盘 public/dish-imgs/，之后命中本地文件秒回；
 * 并发去重：同名请求共享同一次生成的 Promise。
 * 生成失败返回 404，前端 @error 回退 emoji 占位。
 */
const IMG_DIR = path.join(process.cwd(), 'public', 'dish-imgs')
const inflight = new Map<string, Promise<Buffer | null>>()

async function generate(name: string, slug: string): Promise<Buffer | null> {
  if (!process.env.ZHIPU_API_KEY) return null
  // CogView-3-Flash 免费模型有 RPM 限流：429 时退避重试（最多 3 次）
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
        body: JSON.stringify({
          model: 'cogview-3-flash',
          prompt: `「${name}」这道菜的成品真实摄影照片，45度俯拍，盛在白色瓷盘或瓷碗中，木质餐桌背景，柔和自然光，食物特写，色泽诱人，真实照片质感，画面中没有任何文字和水印`,
          size: '1024x1024'
        }),
        signal: AbortSignal.timeout(60000)
      })
      if (res.status === 429) {
        console.warn(`[dish-image] ${name} 限流，第 ${attempt} 次退避重试...`)
        await sleep(15000 * attempt)
        continue
      }
      if (!res.ok) throw new Error(`上游 ${res.status}`)
      const remote: string | undefined = ((await res.json()) as any)?.data?.[0]?.url
      if (!remote) throw new Error('生成接口未返回图片URL')

      const buf = Buffer.from(await (await fetch(remote, { signal: AbortSignal.timeout(20000) })).arrayBuffer())
      fs.mkdirSync(IMG_DIR, { recursive: true })
      fs.writeFileSync(path.join(IMG_DIR, `${slug}.png`), buf)
      return buf
    } catch (err: any) {
      console.error(`[dish-image] ${name} 生成失败:`, err?.message)
      return null
    }
  }
  console.error(`[dish-image] ${name} 重试 3 次仍限流，放弃`)
  return null
}

export default defineEventHandler(async (event) => {
  const name = String(getQuery(event).name ?? '').trim().slice(0, 30)
  if (!name) {
    setResponseStatus(event, 400)
    return
  }

  const slug = createHash('md5').update(name).digest('hex').slice(0, 16)
  const file = path.join(IMG_DIR, `${slug}.png`)

  // 缓存命中：直接回图片
  if (fs.existsSync(file)) {
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return send(event, fs.readFileSync(file), 'image/png')
  }

  // 未命中：生成（并发去重）
  if (!inflight.has(slug)) {
    const p = generate(name, slug).finally(() => inflight.delete(slug))
    inflight.set(slug, p)
  }
  const buf = await inflight.get(slug)!

  if (!buf) {
    setResponseStatus(event, 404)
    return
  }
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  return send(event, buf, 'image/png')
})
