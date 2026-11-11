import { defineEventHandler, getQuery, send, setResponseStatus, setHeader, createError } from 'h3'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const toJpeg = (buf: Buffer) => sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
import { fetchBingDishImage } from '../utils/bingimg'

/** 本地缓存优先，免费网络候选受并发限制；公共读取不生成付费图片。 */
const IMG_DIR = path.join(process.cwd(), 'public', 'dish-imgs')
const inflight = new Map<string, Promise<Buffer | null>>()

export default defineEventHandler(async (event) => {
  const name = String(getQuery(event).name ?? '').trim().slice(0, 30)
  if (getQuery(event).regen === '1') throw createError({ statusCode: 403, statusMessage: 'Image regeneration is not available via public API' })
  const regen = false
  // alt=N（1~9）：「换一张」轮换——命中 {slug}-a{N}.jpg 缓存毫秒级返回，
  // 未命中从必应搜图（0 元，无需 CogView），失败回退默认图
  const alt = Math.max(0, Math.min(9, Number.parseInt(String(getQuery(event).alt ?? '0'), 10) || 0))
  if (!name) {
    setResponseStatus(event, 400)
    return
  }

  const slug = createHash('md5').update(name).digest('hex').slice(0, 16)
  const jpgFile = path.join(IMG_DIR, `${slug}.jpg`)
  const pngFile = path.join(IMG_DIR, `${slug}.png`)
  const altFile = alt > 0 ? path.join(IMG_DIR, `${slug}-a${alt}.jpg`) : null

  const sendJpeg = (buf: Buffer) => {
    const etag = `"${createHash('md5').update(buf).digest('hex')}"`
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'ETag', etag)
    if (event.node.req.headers['if-none-match'] === etag) {
      setResponseStatus(event, 304)
      return
    }
    return send(event, buf, 'image/jpeg')
  }

  // alt 轮换：先查候选缓存
  if (altFile) {
    if (inflight.size >= 4 && !inflight.has(`${slug}-a${alt}`)) throw createError({ statusCode: 429, statusMessage: 'Too many image requests' })
    if (fs.existsSync(altFile)) return sendJpeg(fs.readFileSync(altFile))
    // 未命中：必应现搜（0 元）；成功落盘下次秒回
    if (!inflight.has(`${slug}-a${alt}`)) {
      const p = fetchBingDishImage(name, alt - 1)
        .then((buf) => {
          if (buf) {
            fs.mkdirSync(IMG_DIR, { recursive: true })
            fs.writeFileSync(altFile, buf)
          }
          return buf
        })
        .catch(() => null)
        .finally(() => inflight.delete(`${slug}-a${alt}`))
      inflight.set(`${slug}-a${alt}`, p as Promise<Buffer | null>)
    }
    const altBuf = await inflight.get(`${slug}-a${alt}`)!
    if (altBuf) return sendJpeg(altBuf)
    // 必应失败：回退默认图（保证前端 200 有图）
    if (fs.existsSync(jpgFile)) return sendJpeg(fs.readFileSync(jpgFile))
    setResponseStatus(event, 404)
    return
  }

  // regen=1：跳过缓存读取直接重新生成（generate 内 writeFileSync 覆盖旧图，
  // 不做文件删除——删除类操作在受控环境下会被安全护栏拦截且失败时旧图还在，更稳）

  // 缓存命中：直接回图片（旧 PNG 顺手转 JPEG 落盘）。
  // no-cache + ETag：浏览器每次协商校验（命中 304 不传 body），
  // 保证缓存图被替换后浏览器立即拿到新图，不会展示一天前的旧错图
  if (!regen && fs.existsSync(jpgFile)) {
    const buf = fs.readFileSync(jpgFile)
    const etag = `"${createHash('md5').update(buf).digest('hex')}"`
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'ETag', etag)
    if (event.node.req.headers['if-none-match'] === etag) {
      setResponseStatus(event, 304)
      return
    }
    return send(event, buf, 'image/jpeg')
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

  // 公共读接口不触发计费生成；前端已有占位图。
  setResponseStatus(event, 404)
  return
})
