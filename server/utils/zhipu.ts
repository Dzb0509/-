/**
 * 通用 OpenAI 兼容大模型接入层
 * 文本链路可通过环境变量切换到 DeepSeek 等任何兼容服务：
 *   LLM_BASE_URL=https://api.deepseek.com
 *   LLM_API_KEY=sk-xxx
 *   NUXT_CHAT_MODEL=deepseek-chat
 * 视觉链路默认走智谱 GLM-4V（DeepSeek 无视觉 API，如需切换可配 VISION_*）
 */

export interface ProviderConfig {
  base: string
  key: string
  model: string
}

/** 文本/对话模型配置（点评、Agent、周报） */
export function textConfig(): ProviderConfig {
  const base = process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
  let model = process.env.NUXT_CHAT_MODEL || ''
  if (!model) model = base.includes('deepseek') ? 'deepseek-chat' : 'glm-4-flash'
  return {
    base: base.replace(/\/$/, ''),
    key: process.env.LLM_API_KEY || process.env.ZHIPU_API_KEY || '',
    model
  }
}

/** 视觉模型配置（识餐） */
export function visionConfig(): ProviderConfig {
  const base = process.env.VISION_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
  const model = process.env.NUXT_VISION_MODEL || 'glm-4v-flash'
  return {
    base: base.replace(/\/$/, ''),
    key: process.env.VISION_API_KEY || process.env.ZHIPU_API_KEY || '',
    model
  }
}

export const hasTextKey = () => textConfig().key.length > 10
export const hasVisionKey = () => visionConfig().key.length > 10

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: any
  tool_call_id?: string
}

/** 非流式对话（文本模型，支持 Function Calling；限流/网关错误自动重试 1 次） */
export async function llmChat(messages: LLMMessage[], tools?: any[]) {
  const { base, key, model } = textConfig()
  const call = () =>
    $fetch<any>(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: {
        model,
        messages,
        temperature: 0.6,
        ...(tools?.length ? { tools, tool_choice: 'auto' } : {})
      },
      onResponseError({ response }) {
        console.error(`[llm] ${model} 上游错误 ${response.status}:`, JSON.stringify(response._data)?.slice(0, 600))
      }
    })
  try {
    return await call()
  } catch (e: any) {
    const status = e?.status ?? e?.statusCode ?? e?.response?.status
    if ([408, 429, 500, 502, 503, 504].includes(Number(status))) {
      console.warn(`[llm] ${model} 上游 ${status}，1.2s 后重试一次...`)
      await new Promise((r) => setTimeout(r, 1200))
      return call()
    }
    throw e
  }
}

/** 流式对话（返回原始 Response，配合 pipeOpenAIStream 消费） */
export async function llmChatStream(messages: LLMMessage[]): Promise<Response> {
  const { base, key, model } = textConfig()
  return fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      stream: true
    })
  })
}

/** 文本向量化（批量）。仅智谱/兼容服务提供，其他情况由调用方降级 */
export async function embed(texts: string[]): Promise<number[][]> {
  const { base, key } = textConfig()
  const model = process.env.NUXT_EMBEDDING_MODEL || 'embedding-3'
  const res = await $fetch<{ data: Array<{ embedding: number[] }> }>(`${base}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: { model, input: texts }
  })
  return res.data.map((d) => d.embedding)
}
