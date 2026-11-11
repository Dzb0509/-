/**
 * 图片压缩：保留更多细节并转 JPEG dataURL
 * 用于识餐上传前压图，控制视觉模型 token 消耗
 */
export async function compressImage(
  file: File,
  maxSide = 1536,
  quality = 0.9
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
