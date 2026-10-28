/**
 * RAG 营养知识库：
 * 语料 = 《中国居民膳食指南》核心条目 + 内置食物成分表
 * 检索 = 智谱 embedding-3 向量 + 余弦相似度（小语料内存索引，无需独立向量库）
 * 兜底 = 无 API Key 时降级为关键词匹配
 */
import { FOOD_DB } from './foodDb'
import { zhipuEmbed, hasKey } from './zhipu'

/** 《中国居民膳食指南（2022）》核心条目精编 */
const GUIDELINE_PASSAGES: string[] = [
  '食物多样是平衡膳食的基础，建议平均每天摄入12种以上食物，每周25种以上。',
  '谷类是膳食能量的主要来源，每天摄入谷薯类250-400g，其中全谷物和杂豆类50-150g，薯类50-100g。',
  '餐餐有蔬菜，保证每天摄入不少于300g的新鲜蔬菜，且深色蔬菜应占一半以上。',
  '天天吃水果，保证每天摄入200-350g新鲜水果，果汁不能代替鲜果。',
  '动物性食物优先选择鱼虾类，每天摄入畜禽肉40-75g、水产品40-75g、蛋类40-50g。',
  '吃各种奶制品，摄入量相当于每天300ml以上液态奶；经常吃豆制品，适量吃坚果，大豆及坚果共25-35g。',
  '清淡饮食，成人每天食盐不超过5g，烹调油25-30g，添加糖最好控制在25g以下。',
  '足量饮水，成人每天1500-1700ml，推荐白水或茶水，不喝或少喝含糖饮料。',
  '三餐规律，早餐提供的能量应占全天总能量的25%-30%，午餐占30%-40%，晚餐占30%-35%。',
  '成人每日能量需要量参考：轻体力活动男性约2250kcal，女性约1800kcal，具体因年龄、体重、活动量而异。',
  '减脂建议每日制造300-500kcal的热量缺口，每周减重0.5-1kg为宜，避免过度节食导致肌肉流失。',
  '增肌建议每日热量盈余200-300kcal，蛋白质摄入提升至每公斤体重1.6-2.2g，配合抗阻训练。',
  '控制体重：每周至少进行150分钟中等强度身体活动，减少久坐时间。',
  '进餐顺序建议先吃蔬菜、再吃蛋白质类食物、最后吃主食，有助于平稳餐后血糖。',
  '蛋白质来源优先级：鱼虾类、禽肉、蛋、奶、大豆制品优于肥畜肉和加工肉制品。',
  '油炸、红烧等高油烹饪方式会显著提升菜品热量，清蒸、白灼、快炒更利于控脂。',
  '外卖与食堂餐普遍存在高油高盐问题，建议搭配蔬菜并控制主食份量。',
  '蛋白质摄入不足会影响肌肉合成与饱腹感；长期碳水摄入过低可能引起注意力下降与乏力。',
  '膳食纤维推荐摄入量25-30g/天，全谷物、蔬菜、豆类是主要来源，有助于肠道健康与控制血脂。',
  '钙推荐摄入量800mg/天，奶制品是最佳来源，乳糖不耐受者可选酸奶或低乳糖奶制品。'
]

interface Passage {
  text: string
  vector: number[]
}

let passages: Passage[] | null = null
let building: Promise<void> | null = null

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9)
}

function buildCorpus(): string[] {
  const foodTexts = FOOD_DB.map(
    (f) =>
      `${f.name}：每100g含热量${f.per100.kcal}kcal、蛋白质${f.per100.protein}g、脂肪${f.per100.fat}g、碳水化合物${f.per100.carb}g`
  )
  return [...GUIDELINE_PASSAGES, ...foodTexts]
}

async function build() {
  const corpus = buildCorpus()
  if (!hasKey()) {
    // 无 Key：仅建文本索引（走关键词兜底）
    passages = corpus.map((text) => ({ text, vector: [] }))
    return
  }
  const vectors = await zhipuEmbed(corpus)
  passages = corpus.map((text, i) => ({ text, vector: vectors[i] }))
}

export async function ensureIndex(): Promise<void> {
  if (passages) return
  building ??= build().finally(() => (building = null))
  await building
}

/** 检索最相关的 k 条知识片段 */
export async function retrieve(query: string, k = 4): Promise<string[]> {
  await ensureIndex()
  if (!passages?.length) return []

  // 无 Key 或索引未向量化：2-gram 关键词兜底
  if (!hasKey() || !passages[0].vector.length) {
    const shingles = new Set<string>()
    for (let i = 0; i < query.length - 1; i++) shingles.add(query.slice(i, i + 2))
    return passages
      .map((p) => ({ p, s: [...shingles].filter((w) => p.text.includes(w)).length }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map((x) => x.p.text)
  }

  const [qv] = await zhipuEmbed([query])
  return [...passages]
    .map((p) => ({ p, s: cosine(qv, p.vector) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.p.text)
}
