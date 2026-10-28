/** SSE 流式事件 */
export interface StreamEvent {
  type: 'text' | 'tool' | 'stage' | 'done'
  text?: string
  label?: string
}

/**
 * 消费服务端 SSE 流（与 OpenAI 兼容的流式协议保持一致的消费模式，
 * 后续接入智谱 /api/chat 后只需换服务端实现，前端零改动）
 */
export async function streamSSE(
  url: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  if (!res.ok || !res.body) {
    throw new Error(`流式请求失败：${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        onEvent(JSON.parse(payload))
      } catch {
        // 忽略无法解析的片段
      }
    }
  }
}
