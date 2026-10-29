/**
 * 菜品做法细化脚本：把 dishes.ts 的每道菜步骤重写为「下厨房精选级」超详细教程。
 * 用法：node --env-file=.env scripts/gen-detail.mjs
 * 产出：server/utils/dishes-detail.json  （{ dishId: [step1, step2, ...] }）
 * dishes.ts 会在运行时用该 JSON 覆盖默认步骤（detailSteps 合并逻辑）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DISHES_FILE = path.join(ROOT, 'server/utils/dishes.ts')
const OUT_FILE = path.join(ROOT, 'server/utils/dishes-detail.json')
const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const KEY = process.env.ZHIPU_API_KEY

if (!KEY) {
  console.error('缺少 ZHIPU_API_KEY，请用 node --env-file=.env 运行')
  process.exit(1)
}

// dishes.ts 中每道菜都是单行对象，直接正则提取 id 与菜名
const src = fs.readFileSync(DISHES_FILE, 'utf8')
const dishes = [...src.matchAll(/id: '(d\d+)', name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }))
console.log(`共 ${dishes.length} 道菜待细化`)

const out = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : {}

const SYSTEM = `你是一位有 30 年经验的中餐大厨兼注册营养师，擅长写出「下厨房精选菜谱」级别的超详细做法。
风格要求（参考真实优质菜谱）：
- 每道菜 6~9 步，每步必须包含：用料克数、火候（大火/中火/小火/具体温度）、精确时间、食材状态变化（如"边缘焦黄""汤汁浓稠挂勺""弯曲变红"）、手法要点
- 在合适的位置穿插 1~2 条「⚠️ 贴士」步骤：说明失败点的原因（如"腥水必须倒掉，这是腥味主要来源"）或替代做法
- 语言口语化、有画面感，像老师傅在旁边手把手教
- 婴幼儿辅食必须包含安全提示（不加盐糖蜂蜜、月龄适配、过敏原提醒）
严格输出 JSON（不要输出任何其他文字）：{"<菜id>": ["步骤1", "步骤2", ...], ...}`

/** 宽容解析：整体 JSON 失败时按 "dXXX": ["...", ...] 逐条正则提取 */
function parseLoose(text) {
  try {
    return JSON.parse(text)
  } catch {
    const out = {}
    const re = /"(d\d+)"\s*:\s*\[([\s\S]*?)\]/g
    for (const m of text.matchAll(re)) {
      const id = m[1]
      const strings = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((s) => s[1])
      if (strings.length >= 5) out[id] = strings
    }
    if (!Object.keys(out).length) throw new Error('宽容解析也失败')
    return out
  }
}

async function chat(batch) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `请为以下菜品写出超详细做法步骤：\n${batch.map((d) => `- ${d.id}：${d.name}`).join('\n')}` }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' }
    })
  })
  if (!res.ok) throw new Error(`上游 ${res.status}`)
  const text = (await res.json()).choices?.[0]?.message?.content ?? ''
  return parseLoose(text)
}

let done = 0
for (let i = 0; i < dishes.length; i += 8) {
  const batch = dishes.slice(i, i + 8).filter((d) => !out[d.id]) // 跳过已生成
  if (!batch.length) continue
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await chat(batch)
      let ok = 0
      for (const d of batch) {
        const steps = result[d.id]
        if (Array.isArray(steps) && steps.length >= 5) {
          out[d.id] = steps.map((s) => String(s).replace(/\s+/g, ' ').slice(0, 150))
          ok++
        }
      }
      done += ok
      console.log(`批次 ${i / 8 + 1}: 成功 ${ok}/${batch.length}（累计 ${done}）`)
      break
    } catch (e) {
      console.error(`批次 ${i / 8 + 1} 第 ${attempt} 次失败:`, e.message)
      if (attempt === 3) console.error(`批次 ${i / 8 + 1} 放弃，菜品保留原步骤`)
    }
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 0))
}

fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 0))
console.log(`完成：${Object.keys(out).length}/${dishes.length} 道菜已写入 ${OUT_FILE}`)
