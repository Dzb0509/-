import { defineEventHandler, readBody } from 'h3'
import { hasTextKey, llmChat } from '../utils/zhipu'
import { POP_MAP } from '~/types/recommend'

/**
 * AI 自定义：输入人群 + 口味偏好 + 需求描述 + 忌口，
 * 由 GLM-4 生成个性化饮食方案（宜吃/忌吃/注意点/摘要），供首页与家庭模式引用。
 */
interface Body {
  population?: string
  age?: number
  flavors?: string[]
  needs?: string
  taboos?: string
}

export interface CustomPlan {
  summary: string
  goodFor: string[]
  avoid: string[]
  tips: string[]
  source: 'glm' | 'mock'
}

export default defineEventHandler(async (handler): Promise<CustomPlan> => {
  const body = (await readBody(handler)) as Body
  const pop = POP_MAP[body.population ?? '']
  const popText = pop ? `${pop.emoji} ${pop.label}（${pop.desc}，${pop.ageHint}）` : '普通成年人'
  const flavors = (body.flavors ?? []).filter(Boolean).slice(0, 6)
  const needs = (body.needs ?? '').slice(0, 120)
  const taboos = (body.taboos ?? '').slice(0, 120)

  // ---- 无 Key 兜底：规则拼装 ----
  if (!hasTextKey()) {
    return {
      source: 'mock',
      summary: `${popText}${flavors.length ? `，偏好${flavors.join('/')}口味` : ''}${needs ? `，${needs}` : ''}${taboos ? `；忌口：${taboos}` : ''}。推荐清淡少油、优质蛋白与高纤维蔬菜为主的三餐。`,
      goodFor: ['优质蛋白：鱼虾、鸡胸、豆制品、蛋奶', '高纤维主食：燕麦、糙米、杂粮饭', '当季深色蔬菜占每餐一半'],
      avoid: taboos ? [`忌口提醒：${taboos}`] : ['油炸、腌制、肥腻食物', '含糖饮料与高糖甜点'],
      tips: ['三餐规律，七分饱', '烹饪以蒸煮炖为主，少煎炸']
    }
  }

  // ---- 真实链路 ----
  try {
    const sys = `你是注册营养师。根据用户画像、口味偏好、需求与忌口，生成个性化饮食方案。
严格输出 JSON：{"summary":"50字内方案摘要","goodFor":["宜吃类别/食材，3-5条，每条10字左右"],"avoid":["忌口或慎吃，2-4条，须明确覆盖用户提出的忌口"],"tips":["个性化注意事项，2-3条，结合人群特点"]}`
    const res = await llmChat([
      { role: 'system', content: sys },
      {
        role: 'user',
        content: `用户画像：${popText}${body.age ? `，${body.age}岁` : ''}${flavors.length ? `；口味偏好：${flavors.join('、')}` : ''}${needs ? `；需求描述：${needs}` : ''}${taboos ? `；忌口（必须全部纳入 avoid）：${taboos}` : ''}`
      }
    ])
    const text: string = res.choices?.[0]?.message?.content ?? ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('解析失败')
    const p = JSON.parse(m[0])
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 5) : [])
    return {
      source: 'glm',
      summary: String(p.summary ?? '').slice(0, 100),
      goodFor: arr(p.goodFor).length ? arr(p.goodFor) : ['优质蛋白', '全谷物主食', '深色蔬菜'],
      avoid: arr(p.avoid).length ? arr(p.avoid) : ['油炸腌制食品'],
      tips: arr(p.tips).length ? arr(p.tips) : ['三餐规律，七分饱']
    }
  } catch (err: any) {
    console.error('[customize] GLM 调用失败，降级规则版：', err?.message)
    return {
      source: 'mock',
      summary: `${popText}：建议蒸煮炖为主、优质蛋白打底、深色蔬菜过半。`,
      goodFor: ['鱼虾禽蛋豆制品', '杂粮主食', '深色蔬菜'],
      avoid: taboos ? [`忌口：${taboos}`] : ['油炸腌制', '高糖甜饮'],
      tips: ['细嚼慢咽七分饱', '每天饮水 1500ml 以上']
    }
  }
})
