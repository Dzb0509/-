/** SSE 公共工具：初始化响应头、写入事件、消费上游 OpenAI 兼容流 */

export function initSSE(event: any) {
  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  return {
    write(obj: unknown) {
      event.node.res.write(`data: ${JSON.stringify(obj)}\n\n`)
    },
    end() {
      event.node.res.write('data: [DONE]\n\n')
      event.node.res.end()
    }
  }
}

/**
 * 消费上游 OpenAI 兼容 SSE 流（智谱格式），转发为 {type:'text', text: delta} 事件
 */
export async function pipeOpenAIStream(
  upstream: Response,
  write: (e: { type: 'text'; text: string }) => void
): Promise<void> {
  if (!upstream.body) throw new Error('上游无响应体')
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) write({ type: 'text', text: delta })
      } catch {
        // 忽略无法解析的心跳/分片
      }
    }
  }
}
