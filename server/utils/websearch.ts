/**
 * 智谱 Web Search API（search_std 引擎，约 0.01 元/次）：
 * 给「家庭食谱」提供联网搜索能力 —— 按家庭构成搜索适合的菜谱灵感，
 * 由 GLM 融合成完整菜谱后进入推荐结果（source: 'web'）。
 * 失败/无 Key 静默返回空数组，绝不阻塞推荐主链路。
 */

export interface WebHit {
  title: string
  content: string
  link?: string
  media?: string
}

export async function webSearch(query: string, count = 5): Promise<WebHit[]> {
  const key = process.env.ZHIPU_API_KEY
  if (!key) return []
  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/web_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        search_engine: 'search_std',
        search_query: query.slice(0, 100),
        count
      }),
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error(`上游 ${res.status}`)
    const data: any = await res.json()
    return (data?.search_result ?? []).map((r: any) => ({
      title: String(r.title ?? ''),
      content: String(r.content ?? '').slice(0, 300),
      link: r.link,
      media: r.media
    }))
  } catch (err: any) {
    console.warn('[websearch] 搜索失败（已跳过联网参考）:', err?.message)
    return []
  }
}

/** 把搜索结果压成 prompt 友好的文本（控制长度） */
export function webHitsToPrompt(hits: WebHit[]): string {
  return hits
    .slice(0, 5)
    .map((h, i) => `${i + 1}.【${h.title}】${h.content}`)
    .join('\n')
}
