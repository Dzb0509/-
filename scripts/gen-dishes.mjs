/**
 * 菜系扩充脚本：每个菜系至少 25 道菜。
 * 从 /api/dishes 读现有菜品 → 计算各菜系缺口 → GLM 分批生成（健康改良版）→
 * 校验（去重/字段/数值钳制）→ 写 server/utils/dishes-generated.json。
 * 支持断点续跑：已凑够 25 道的菜系自动跳过。
 * 用法: node --env-file=.env scripts/gen-dishes.mjs [baseUrl]
 */
import fs from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const KEY = process.env.ZHIPU_API_KEY
if (!KEY) {
  console.error('缺少 ZHIPU_API_KEY')
  process.exit(1)
}
const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const OUT_FILE = new URL('../server/utils/dishes-generated.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const TARGET = 25
const BATCH = 6
const CONCURRENCY = 3

const REGIONS = [
  ['粤菜', 'yue'], ['川菜', 'ch'], ['湘菜', 'xn'], ['鲁菜', 'lu'], ['苏浙菜', 'sz'],
  ['闽菜', 'mn'], ['徽菜', 'hui'], ['东北菜', 'db'], ['西北面食', 'xb'],
  ['湖北菜', 'hb'], ['云南菜', 'yn'], ['贵州菜', 'gz'], ['京菜', 'jng'], ['新疆菜', 'xj'],
  ['客家菜', 'kj'], ['赣菜', 'gn'], ['广西菜', 'gx'], ['本帮菜', 'bn'], ['豫菜', 'yu'], ['山西面食', 'sxi']
]
const ALLOWED_POPS = ['balance', 'lose', 'muscle', 'sugar', 'child', 'pregnant', 'elderly', 'hypertension', 'diabetes', 'hyperlipid', 'toddler', 'lactation']

const SYSTEM = `你是资深中餐营养师。为「食刻AI」健康餐饮应用扩充菜品库。要求：
1. 菜品必须是该菜系真实存在的名菜或地道家常菜，可做健康改良（少油少盐少糖、蒸煮炖烤替代油炸），名字可加「（少油）」「（改良）」等后缀
2. 每批菜品要多样化：荤菜/素菜/汤羹/水产/豆制品/主食搭配，不要同类重复
3. steps 必须是超详细做法：每步含克数/火候/时间/状态判断，关键步骤带技巧或失败点提醒（如「焯水30秒过冰水保脆」「大火收汁至挂勺」）
4. 严格输出 JSON：{"dishes":[{"name":"","flavors":["清淡"],"pops":["balance"],"nutrition":{"kcal":250,"protein":20,"fat":10,"carb":15},"ingredients":["主料 200g","辅料 50g"],"steps":["","","","","",""],"highlight":"一句健康亮点"}]}
5. flavors 从这些词选1-3个：清淡/咸鲜/辣/麻/酸/甜/酱香/蒜香/鲜/苦
6. pops 从这些选1-6个（不要选 infant，1岁以下辅食安全要求高禁止生成）：balance均衡/lose减脂/muscle增肌/sugar控糖/child儿童/pregnant孕期/elderly老年/hypertension高血压/diabetes糖尿病/hyperlipid高血脂/toddler幼儿/lactation哺乳
7. 营养数值按单人份合理估算，kcal 40~800；ingredients 4-8 项带克数；steps 6-8 步`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function chat(userContent, attempt = 1) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent }
        ],
        temperature: 0.85,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(120000)
    })
    if (res.status === 429) {
      if (attempt > 4) return []
      await sleep(12000 * attempt)
      return chat(userContent, attempt + 1)
    }
    if (!res.ok) throw new Error(`上游 ${res.status}`)
    const text = (await res.json()).choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(text)
    return Array.isArray(parsed.dishes) ? parsed.dishes : []
  } catch (e) {
    console.error('  调用失败:', e.message)
    if (attempt <= 2) {
      await sleep(5000)
      return chat(userContent, attempt + 1)
    }
    return []
  }
}

function sanitize(raw, region, existingNames) {
  const out = []
  for (const d of raw) {
    try {
      const name = String(d.name ?? '').trim().slice(0, 24)
      if (!name || name.length < 2 || existingNames.has(name)) continue
      const pops = [...new Set((d.pops ?? []).filter((p) => ALLOWED_POPS.includes(p)))]
      if (!pops.length) pops.push('balance')
      const n = d.nutrition ?? {}
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)))
      const flavors = [...new Set((d.flavors ?? []).map((f) => String(f).slice(0, 3)).filter(Boolean))].slice(0, 3)
      const steps = (d.steps ?? []).map((s) => String(s).trim().slice(0, 150)).filter((s) => s.length > 5)
      const ingredients = (d.ingredients ?? []).map((s) => String(s).trim().slice(0, 30)).filter(Boolean).slice(0, 8)
      if (steps.length < 5 || ingredients.length < 3) continue
      out.push({
        name,
        region,
        flavors: flavors.length ? flavors : ['清淡'],
        pops,
        nutrition: { kcal: clamp(n.kcal, 40, 800), protein: clamp(n.protein, 0, 60), fat: clamp(n.fat, 0, 50), carb: clamp(n.carb, 0, 90) },
        ingredients,
        steps,
        highlight: String(d.highlight ?? '').trim().slice(0, 40) || '健康改良版家常美味'
      })
      existingNames.add(name)
    } catch { /* 跳过坏数据 */ }
  }
  return out
}

async function main() {
  const res = await fetch(`${BASE}/api/dishes`)
  const { dishes: existing } = await res.json()
  const existingNames = new Set(existing.map((d) => d.name))
  const counts = {}
  for (const d of existing) counts[d.region] = (counts[d.region] ?? 0) + 1

  let out = []
  if (fs.existsSync(OUT_FILE)) {
    out = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
    // API 已合并 out 里的菜，这里只补名字去重集合，不重复计数
    for (const d of out) existingNames.add(d.name)
  }

  const seqs = {}
  for (const d of out) {
    const [, code] = REGIONS.find(([, c]) => d.id?.startsWith(c)) ?? []
  }

  const preExisting = out.length

  // 为每个菜系建任务批次
  const tasks = []
  for (const [region, code] of REGIONS) {
    const have = counts[region] ?? 0
    const need = TARGET - have
    if (need <= 0) {
      console.log(`${region}: 已有 ${have} 道，跳过`)
      continue
    }
    // 序号接着已有的编
    let seq = 1
    const used = new Set(out.map((d) => d.id).filter((id) => id?.startsWith(code)))
    while ([...used].some((id) => id === `${code}${String(seq).padStart(2, '0')}`)) seq++
    for (let i = 0; i < need; i += BATCH) {
      tasks.push({ region, code, count: Math.min(BATCH, need - i), startSeq: seq + i })
    }
    console.log(`${region}: 已有 ${have}，需补 ${need}（${Math.ceil(need / BATCH)} 批）`)
  }

  let idx = 0
  let done = 0
  async function worker(wid) {
    while (idx < tasks.length) {
      const t = tasks[idx++]
      const existingList = [...existingNames].filter(() => false) // 名单太大不进 prompt，靠去重集合拦截
      const raw = await chat(
        `菜系：${t.region}。请生成 ${t.count} 道该菜系菜品（本轮主题侧重：${['鱼虾水产与汤羹', '禽畜肉类', '蔬菜豆制品与蛋类', '主食与特色小吃', '蔬菜菌菇与汤煲', '荤素搭配硬菜'][(done + wid) % 6]}），名字自然、健康改良。`
      )
      const ok = sanitize(raw, t.region, existingNames)
      ok.forEach((d, i) => {
        d.id = `${t.code}${String(t.startSeq + i).padStart(2, '0')}`
        out.push(d)
      })
      done++
      fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 0))
      console.log(`[W${wid}] ${t.region} +${ok.length}/${t.count}（累计库内 ${existing.length + out.length}）`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)))

  // 汇总（以 API 真实数量为准）
  console.log('--- 各菜系最终数量 ---')
  for (const [r, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`${r}: ${c}`)
  console.log(`本轮新增 ${out.length - preExisting} 道，累计 ${out.length} 道，写入 ${OUT_FILE}`)
}

main()
