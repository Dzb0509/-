/** 智谱 AI 开放平台接入层（OpenAI 兼容协议） */

const BASE = 'https://open.bigmodel.cn/api/paas/v4'

export const zhipuKey = () => process.env.ZHIPU_API_KEY || ''
export const hasKey = () => zhipuKey().length > 10
export const visionModel = () => process.env.NUXT_VISION_MODEL || 'glm-4v-flash'
export const chatModel = () => process.env.NUXT_CHAT_MODEL || 'glm-4-flash'
export const embedModel = () => process.env.NUXT_EMBEDDING_MODEL || 'embedding-3'

export interface ZhipuMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: any
  tool_call_id?: string
}

/** 非流式对话 */
export async function zhipuChat(messages: ZhipuMessage[], tools?: any[]) {
  return $fetch<any>(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${zhipuKey()}` },
    body: {
      model: chatModel(),
      messages,
      temperature: 0.6,
      ...(tools?.length ? { tools, tool_choice: 'auto' } : {})
    }
  })
}

/** 流式对话（返回原始 Response，配合 pipeOpenAIStream 消费） */
export async function zhipuChatStream(messages: ZhipuMessage[]): Promise<Response> {
  return fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${zhipuKey()}`
    },
    body: JSON.stringify({
      model: chatModel(),
      messages,
      temperature: 0.6,
      stream: true
    })
  })
}

/** 文本向量化（批量） */
export async function zhipuEmbed(texts: string[]): Promise<number[][]> {
  const res = await $fetch<{ data: Array<{ embedding: number[] }> }>(`${BASE}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${zhipuKey()}` },
    body: { model: embedModel(), input: texts }
  })
  return res.data.map((d) => d.embedding)
}
