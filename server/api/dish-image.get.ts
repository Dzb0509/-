import { defineEventHandler, getQuery, send, setResponseStatus, setHeader } from 'h3'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { DISHES } from '../utils/dishes'

/**
 * 菜品真实图片：按菜名用智谱 CogView-3-Flash（免费）生成真实感菜品照片。
 * 直接返回 JPEG 二进制，可作 <img src> 使用（DishCard / HeroCarousel）。
 * - 生成后经 sharp 压成 512px JPEG（体积 ~1/10，加载快）
 * - 首次生成后落盘 public/dish-imgs/{slug}.jpg，之后命中本地文件秒回
 * - ?regen=1 删除缓存强制重新生成（图片与菜名对不上时用）
 * - 旧版 PNG 缓存读取时自动转 JPEG 并替换
 * - 并发去重：同名请求共享同一次生成的 Promise；失败返回 404，前端回退 emoji 占位
 */
const IMG_DIR = path.join(process.cwd(), 'public', 'dish-imgs')
const inflight = new Map<string, Promise<Buffer | null>>()

/** 生成并发闸：CogView 限流严格，同时最多 2 个生成任务（多余排队） */
const GEN_LIMIT = 2
let genActive = 0
const genWaiters: (() => void)[] = []
async function acquireGenSlot() {
  if (genActive < GEN_LIMIT) {
    genActive++
    return
  }
  await new Promise<void>((resolve) => genWaiters.push(resolve))
  genActive++
}
function releaseGenSlot() {
  genActive--
  genWaiters.shift()?.()
}

/** 从菜库查该菜的主料，拼进生成 prompt（图文更对得上） */
function mainIngredients(name: string): string {
  const dish = DISHES.find((d) => d.name === name)
  if (!dish?.ingredients?.length) return ''
  const majors = dish.ingredients
    .filter((i) => i.startsWith('主料') || /肉|鱼|虾|蛋|豆腐|菜|瓜|菌|菇|鸡|牛|羊|米|面/.test(i))
    .slice(0, 3)
    .map((i) => i.replace(/^主料\s*/, ''))
  return majors.length ? `主要食材：${majors.join('、')}，画面中必须出现这些食材` : ''
}

/**
 * 清洗菜名：剥掉「（少油）（改良）」等健康化修饰词。
 * CogView 对带括号修饰的怪菜名容易跑偏（生成人物/风景），
 * 核心菜名进主 prompt，修饰词转成风格短语。
 */
function cleanDishName(name: string): { core: string; style: string } {
  const quals = [...name.matchAll(/[（(]([^）)]*)[）)]/g)].map((m) => m[1]).filter(Boolean)
  const core = name.replace(/[（(][^）)]*[）)]/g, '').trim() || name
  return { core, style: quals.join('、') }
}

async function toJpeg(buf: Buffer): Promise<Buffer> {
  return sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
}

async function generate(name: string, slug: string): Promise<Buffer | null> {
  if (!process.env.ZHIPU_API_KEY) return null
  // CogView-3-Flash 免费模型有 RPM 限流：429 时退避重试（最多 3 次）
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const { core, style } = cleanDishName(name)
  const ingredientHint = mainIngredients(name)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
        body: JSON.stringify({
          // CogView-4 付费模型（~0.06元/张）：免费版 cogview-3-flash 会随机生成
          // 人物/风景等无关图片（实测退化严重），换一张按钮也走此模型
          model: 'cogview-4-250304',
          prompt: `一盘做好的中国菜「${core}」的成品特写真实摄影${style ? `，${style}的健康做法版本` : ''}${ingredientHint ? `，${ingredientHint}` : ''}。画面里只有盛在白瓷盘中的这道菜的食物本体，食物占满画面中心 90%，45度俯拍，木质餐桌浅色背景，柔和自然光，色泽诱人。画面中绝对不能出现人物、人脸、文字、水印、建筑、风景或任何与这道菜无关的物体`,
          size: '1024x1024'
        }),
        signal: AbortSignal.timeout(60000)
      })
      if (res.status === 429) {
        console.warn(`[dish-image] ${name} 限流，第 ${attempt} 次退避重试...`)
        await sleep(20000 * attempt + Math.random() * 5000)
        continue
      }
      if (!res.ok) throw new Error(`上游 ${res.status}`)
      const remote: string | undefined = ((await res.json()) as any)?.data?.[0]?.url
      if (!remote) throw new Error('生成接口未返回图片URL')

      const raw = Buffer.from(await (await fetch(remote, { signal: AbortSignal.timeout(30000) })).arrayBuffer())
      const buf = await toJpeg(raw)
      fs.mkdirSync(IMG_DIR, { recursive: true })
      fs.writeFileSync(path.join(IMG_DIR, `${slug}.jpg`), buf)
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
  const regen = getQuery(event).regen === '1'
  if (!name) {
    setResponseStatus(event, 400)
    return
  }

  const slug = createHash('md5').update(name).digest('hex').slice(0, 16)
  const jpgFile = path.join(IMG_DIR, `${slug}.jpg`)
  const pngFile = path.join(IMG_DIR, `${slug}.png`)

  // regen=1：跳过缓存读取直接重新生成（generate 内 writeFileSync 覆盖旧图，
  // 不做文件删除——删除类操作在受控环境下会被安全护栏拦截且失败时旧图还在，更稳）

  // 缓存命中：直接回图片（旧 PNG 顺手转 JPEG 落盘）
  if (!regen && fs.existsSync(jpgFile)) {
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return send(event, fs.readFileSync(jpgFile), 'image/jpeg')
  }
  if (!regen && fs.existsSync(pngFile)) {
    try {
      const buf = await toJpeg(fs.readFileSync(pngFile))
      fs.writeFileSync(jpgFile, buf)
      try {
        fs.unlinkSync(pngFile)
      } catch {
        /* 删除被拦截也不影响：jpg 已落盘，下次优先命中 jpg */
      }
      setHeader(event, 'Cache-Control', 'public, max-age=86400')
      return send(event, buf, 'image/jpeg')
    } catch {
      /* 转换失败则走重新生成 */
    }
  }

  // 未命中：生成（同名并发去重 + 全局并发闸防限流风暴）
  if (!inflight.has(slug)) {
    const p = acquireGenSlot()
      .then(() => generate(name, slug))
      .finally(() => {
        releaseGenSlot()
        inflight.delete(slug)
      })
    inflight.set(slug, p)
  }
  const buf = await inflight.get(slug)!

  if (!buf) {
    setResponseStatus(event, 404)
    return
  }
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  return send(event, buf, 'image/jpeg')
})
