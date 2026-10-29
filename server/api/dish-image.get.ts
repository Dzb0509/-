import { defineEventHandler, getQuery } from 'h3'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 菜品真实图片：按菜名用智谱 CogView-3-Flash（免费）生成真实感菜品照片。
 * 首次生成后落盘 public/dish-imgs/，之后直接命中本地文件，零成本秒开。
 * 并发去重：同名请求共享同一次生成的 Promise。
 * 返回 { url }；url 为空表示生成失败，前端回退到 emoji 占位。
 */
const IMG_DIR = path.join(process.cwd(), 'public', 'dish-imgs')
const inflight = new Map<string, Promise<{ url: string }>>()

async function generate(name: string, slug: string): Promise<{ url: string }> {
  const file = path.join(IMG_DIR, `${slug}.png`)
  if (!process.env.ZHIPU_API_KEY) return { url: '' }
  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
      body: JSON.stringify({
        model: 'cogview-3-flash',
        prompt: `「${name}」这道菜的成品真实摄影照片，45度俯拍，盛在白色瓷盘或瓷碗中，木质餐桌背景，柔和自然光，食物特写，色泽诱人，真实照片质感，画面中没有任何文字和水印`,
        size: '1024x1024'
      }),
      signal: AbortSignal.timeout(45000)
    })
    if (!res.ok) throw new Error(`上游 ${res.status}`)
    const remote: string | undefined = ((await res.json()) as any)?.data?.[0]?.url
    if (!remote) throw new Error('生成接口未返回图片URL')

    const buf = Buffer.from(await (await fetch(remote, { signal: AbortSignal.timeout(20000) })).arrayBuffer())
    fs.mkdirSync(IMG_DIR, { recursive: true })
    fs.writeFileSync(file, buf)
    return { url: `/dish-imgs/${slug}.png`, cached: false }
  } catch (err: any) {
    console.error(`[dish-image] ${name} 生成失败:`, err?.message)
    return { url: '' }
  }
}

export default defineEventHandler(async (event) => {
  const name = String(getQuery(event).name ?? '').trim().slice(0, 30)
  if (!name) return { url: '' }

  const slug = createHash('md5').update(name).digest('hex').slice(0, 16)
  const file = path.join(IMG_DIR, `${slug}.png`)
  if (fs.existsSync(file)) return { url: `/dish-imgs/${slug}.png`, cached: true }

  if (!inflight.has(slug)) {
    const p = generate(name, slug).finally(() => inflight.delete(slug))
    inflight.set(slug, p)
  }
  return inflight.get(slug)!
})
