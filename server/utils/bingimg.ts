/**
 * 必应图片搜索工具（0 元方案）：
 * 「换一张」时按菜名从必应搜真实菜品图，下载后裁边去水印 + sharp 压缩。
 * 不做 GLM-4V 质检（省钱省时）——候选里用户不满意可继续点「换一张」轮换。
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** 必应图片搜索：返回原图直链列表 */
export async function bingImageUrls(query: string, count = 10): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cn.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) return []
    const html = await res.text()
    const urls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map((m) => m[1])
    return [...new Set(urls)].slice(0, count)
  } catch {
    return []
  }
}

/** 裁掉四边 12%（物理去除角落水印）再压成 512px JPEG */
async function cropAndCompress(raw: Buffer): Promise<Buffer> {
  const { default: sharp } = await import('sharp')
  const img = sharp(raw)
  const meta = await img.metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  let pipeline = img
  if (w > 100 && h > 100) {
    pipeline = img.extract({
      left: Math.round(w * 0.12),
      top: Math.round(h * 0.12),
      width: Math.round(w * 0.76),
      height: Math.round(h * 0.76)
    })
  }
  return pipeline.resize(512, 512, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
}

/** 下载单张（跳过非图片/太小） */
async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://cn.bing.com/' },
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > 8000 ? buf : null
  } catch {
    return null
  }
}

/** Worker 环境不能写本地磁盘，返回远程图片原始内容作为轻量回退。 */
export async function fetchBingDishImageRemote(
  name: string,
  preferIndex: number
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const core = name.replace(/[（(][^）)]*[）)]/g, '').trim() || name
  const urls = await bingImageUrls(`${core} 家常菜 成品 特写`, 12)
  if (!urls.length) return null
  const start = ((preferIndex % urls.length) + urls.length) % urls.length
  for (let k = 0; k < 5; k++) {
    try {
      const res = await fetch(urls[(start + k) % urls.length], {
        headers: { 'User-Agent': UA, Referer: 'https://cn.bing.com/' },
        signal: AbortSignal.timeout(12000)
      })
      const contentType = res.headers.get('content-type') ?? ''
      if (res.ok && contentType.startsWith('image/')) return { body: await res.arrayBuffer(), contentType }
    } catch {
      /* 换下一张候选图 */
    }
  }
  return null
}

/**
 * 按菜名从必应取一张「第 alt 张」候选图。
 * 从 preferIndex 开始顺延尝试（最多 5 个），全部失败返回 null。
 * @param name 菜名（内部剥掉「（少油）」等修饰词再搜）
 * @param preferIndex 希望取的候选下标（0 起），实现不同 alt 轮换到不同图
 */
export async function fetchBingDishImage(name: string, preferIndex: number): Promise<Buffer | null> {
  const core = name.replace(/[（(][^）)]*[）)]/g, '').trim() || name
  const urls = await bingImageUrls(`${core} 家常菜 成品 特写`, 12)
  if (!urls.length) return null
  const start = ((preferIndex % urls.length) + urls.length) % urls.length
  for (let k = 0; k < 5; k++) {
    const raw = await download(urls[(start + k) % urls.length])
    if (raw) {
      try {
        return await cropAndCompress(raw)
      } catch {
        /* sharp 处理失败换下一张 */
      }
    }
  }
  return null
}
