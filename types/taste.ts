/**
 * 口味画像：从用户饮食记录中自动学习偏好。
 * 关键词匹配 → 计数累计，推荐时作为个性化上下文喂给大模型。
 */

export type TasteFlavor = '辣' | '清淡' | '咸鲜' | '甜' | '酸' | '麻' | '蒜香' | '酱香'

export interface TasteProfile {
  flavors: Partial<Record<TasteFlavor, number>>
  /** 地域菜系偏好，如 川菜/粤菜 */
  regions: Record<string, number>
  /** 常吃食材 */
  ingredients: Record<string, number>
}

/** 口味关键词 → 归一化口味（按食物名/菜名匹配） */
const FLAVOR_RULES: [TasteFlavor, string[]][] = [
  ['辣', ['辣', '剁椒', '干锅', '香锅', '水煮', '麻辣', '泡椒', '辣子']],
  ['麻', ['麻', '花椒', '麻婆']],
  ['清淡', ['清蒸', '水煮', '白灼', '清炒', '凉拌', '蒸蛋', '粥', '清汤', '炖']],
  ['咸鲜', ['炒', '烧', '焖', '焗', '煎', '卤']],
  ['甜', ['糖醋', '甜', '蜜', '拔丝', '番茄']],
  ['酸', ['酸', '醋', '柠檬', '泡菜']],
  ['蒜香', ['蒜']],
  ['酱香', ['酱', '红烧', '豉', '回锅']]
]

/** 地域菜系关键词 */
const REGION_RULES: [string, string[]][] = [
  ['川菜', ['川', '麻辣', '麻婆', '回锅', '水煮鱼', '辣子', '鱼香', '泡椒']],
  ['粤菜', ['粤', '白灼', '清蒸鲈鱼', '叉烧', '煲', '肠粉', '老火']],
  ['湘菜', ['湘', '剁椒', '毛氏', '小炒肉']],
  ['鲁菜', ['鲁', '爆炒', '葱烧', '糖醋鲤鱼']],
  ['苏浙菜', ['苏', '浙', '西湖', '东坡', '龙井', '腌笃']],
  ['东北菜', ['东北', '锅包肉', '地三鲜', '酸菜', '乱炖']],
  ['西北面食', ['西北', '兰州', '拉面', '羊肉泡', '油泼']],
  ['家常菜', ['番茄炒蛋', '青椒肉丝', '土豆丝', '蛋炒饭']]
]

/** 常见食材关键词 */
const INGREDIENT_RULES = [
  '鸡胸', '牛肉', '鱼', '虾', '蛋', '豆腐', '西兰花', '番茄', '土豆', '米饭', '面',
  '燕麦', '牛奶', '酸奶', '生菜', '菠菜', '菌菇', '山药', '南瓜', '糙米', '玉米'
]

function countMatch(text: string, words: string[]): number {
  let n = 0
  for (const w of words) {
    // '麻 ?' 之类的占位不匹配
    if (w.includes('?')) continue
    if (text.includes(w)) n++
  }
  return n
}

/** 从一批食物/菜名中学习口味偏好，累计进画像 */
export function learnTaste(profile: TasteProfile, names: string[]): TasteProfile {
  const next: TasteProfile = {
    flavors: { ...profile.flavors },
    regions: { ...profile.regions },
    ingredients: { ...profile.ingredients }
  }
  for (const raw of names) {
    const text = raw ?? ''
    for (const [flavor, words] of FLAVOR_RULES) {
      const hit = countMatch(text, words)
      if (hit > 0) next.flavors[flavor] = (next.flavors[flavor] ?? 0) + hit
    }
    for (const [region, words] of REGION_RULES) {
      const hit = countMatch(text, words)
      if (hit > 0) next.regions[region] = (next.regions[region] ?? 0) + hit
    }
    const explicitRegion = text.match(/(?:菜系|region)[:：\s]*([^，,；;|]+)/i)?.[1]?.trim()
    if (explicitRegion && explicitRegion.length <= 20 && explicitRegion !== '未知') {
      next.regions[explicitRegion] = (next.regions[explicitRegion] ?? 0) + 2
    }
    for (const ing of INGREDIENT_RULES) {
      if (text.includes(ing)) next.ingredients[ing] = (next.ingredients[ing] ?? 0) + 1
    }
  }
  return next
}

/** 取画像 Top-N（用于 UI 展示与提示词） */
export function topEntries(rec: Record<string, number>, n = 3): string[] {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

export function emptyTaste(): TasteProfile {
  return { flavors: {}, regions: {}, ingredients: {} }
}
