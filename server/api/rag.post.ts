// POST /api/rag —— 知识库检索接口（演示/调试「先检索后生成」链路）
import { retrieve } from '../utils/rag'
import { hasTextKey } from '../utils/zhipu'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ query?: string; k?: number }>(event)
  const query = body?.query?.trim() || ''
  if (!query) {
    throw createError({ statusCode: 400, statusMessage: 'query is required' })
  }
  const passages = await retrieve(query, Math.min(10, Math.max(1, body?.k ?? 4)))
  return {
    ok: true,
    mode: hasTextKey() ? 'vector' : 'keyword',
    query,
    passages
  }
})
