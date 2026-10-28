import type { Dish } from '~/types/recommend'

/**
 * 菜品库（演示数据）：覆盖八大菜系 + 地域家常，标注人群/口味/单人份营养/做法。
 * 正式版由 RAG 知识库 + AI 生成扩充，此处为种子数据。
 */
export const DISHES: Dish[] = [
  // ---------- 早餐 ----------
  { id: 'd001', name: '燕麦牛奶粥', region: '家常菜', flavors: ['清淡'], pops: ['balance', 'lose', 'sugar', 'muscle'], nutrition: { kcal: 280, protein: 12, fat: 7, carb: 42 }, ingredients: ['燕麦 40g', '纯牛奶 250ml', '奇亚籽 5g'], steps: ['燕麦加 200ml 水小火煮 5 分钟', '倒入牛奶再煮 2 分钟至浓稠', '撒奇亚籽即可'], highlight: '低 GI 慢碳，饱腹感强' },
  { id: 'd002', name: '全麦鸡蛋三明治', region: '家常菜', flavors: ['清淡'], pops: ['balance', 'lose', 'muscle'], nutrition: { kcal: 320, protein: 18, fat: 12, carb: 34 }, ingredients: ['全麦面包 2 片', '鸡蛋 1 个', '生菜 2 片', '番茄 2 片'], steps: ['鸡蛋煮 8 分钟切片', '面包铺生菜、番茄、蛋片', '对折压实即可'], highlight: '优质蛋白 + 全麦纤维' },
  { id: 'd003', name: '广式虾仁肠粉', region: '粤菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'sugar'], nutrition: { kcal: 300, protein: 15, fat: 6, carb: 46 }, ingredients: ['肠粉预拌粉 80g', '虾仁 60g', '生抽 5ml', '葱花少许'], steps: ['粉浆摊入蒸盘薄薄一层', '铺虾仁大火蒸 3 分钟', '卷起淋豉油汁'], highlight: '广式经典，蒸制少油' },
  { id: 'd004', name: '小米南瓜粥', region: '家常菜', flavors: ['清淡', '甜'], pops: ['balance', 'sugar'], nutrition: { kcal: 220, protein: 6, fat: 2, carb: 45 }, ingredients: ['小米 50g', '南瓜 100g'], steps: ['南瓜切小块与小米同煮', '小火 25 分钟至软糯'], highlight: '养胃缓释碳水' },
  { id: 'd005', name: '京味鸡蛋灌饼（改良）', region: '家常菜', flavors: ['咸鲜'], pops: ['muscle'], nutrition: { kcal: 380, protein: 16, fat: 14, carb: 45 }, ingredients: ['全麦饼坯 1 张', '鸡蛋 1 个', '生菜', '甜面酱 5g'], steps: ['饼坯烙至鼓包灌入蛋液', '两面烙金黄', '卷生菜刷薄酱'], highlight: '训练前碳水源' },

  // ---------- 川菜 ----------
  { id: 'd101', name: '轻油版麻婆豆腐', region: '川菜', flavors: ['麻', '辣', '咸鲜'], pops: ['balance', 'muscle'], nutrition: { kcal: 260, protein: 18, fat: 14, carb: 12 }, ingredients: ['嫩豆腐 300g', '牛肉末 40g', '郫县豆瓣 10g', '花椒粉 2g'], steps: ['豆腐焯水定型', '少油炒肉末与豆瓣出红油', '下豆腐烧 3 分钟勾薄芡', '撒花椒粉出锅'], highlight: '植物蛋白大户，控油版减 40% 油' },
  { id: 'd102', name: '水煮鱼片（少油版）', region: '川菜', flavors: ['辣', '麻', '咸鲜'], pops: ['muscle', 'balance'], nutrition: { kcal: 320, protein: 34, fat: 15, carb: 10 }, ingredients: ['黑鱼片 200g', '豆芽 100g', '干辣椒 5g', '花椒 2g'], steps: ['鱼片上浆滑水捞出', '豆芽垫底铺鱼片', '热油激香干辣椒花椒淋上'], highlight: '高蛋白低脂，辣而不腻' },
  { id: 'd103', name: '鱼香鸡丝（兔油版）', region: '川菜', flavors: ['辣', '甜', '酸'], pops: ['balance', 'muscle'], nutrition: { kcal: 290, protein: 28, fat: 10, carb: 18 }, ingredients: ['鸡胸肉 150g', '木耳 30g', '泡椒 10g', '糖 3g', '醋 5ml'], steps: ['鸡丝上浆滑炒', '泡椒姜蒜爆香', '调入鱼香汁翻匀'], highlight: '把经典鱼香做出低脂版' },
  { id: 'd104', name: '凉拌折耳根', region: '川菜', flavors: ['酸', '辣'], pops: ['lose', 'balance'], nutrition: { kcal: 70, protein: 2, fat: 3, carb: 8 }, ingredients: ['折耳根 150g', '糊辣椒 2g', '醋 5ml'], steps: ['折耳根洗净掐段', '加调料拌匀即可'], highlight: '云贵川特色，膳食纤维满分' },

  // ---------- 粤菜 ----------
  { id: 'd201', name: '清蒸鲈鱼', region: '粤菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'sugar'], nutrition: { kcal: 240, protein: 32, fat: 9, carb: 4 }, ingredients: ['鲈鱼 1 条(约400g)', '姜丝葱丝', '蒸鱼豉油 10ml'], steps: ['鱼身划刀铺姜丝', '水开蒸 8 分钟', '弃汤汁铺葱丝淋热油与豉油'], highlight: '粤菜代表作，高蛋白标杆' },
  { id: 'd202', name: '白灼菜心', region: '粤菜', flavors: ['清淡'], pops: ['balance', 'lose', 'sugar'], nutrition: { kcal: 80, protein: 3, fat: 4, carb: 8 }, ingredients: ['菜心 250g', '生抽 5ml', '蒜片'], steps: ['水开加少许盐与油', '菜心灼 1 分钟摆盘', '淋豉油汁'], highlight: '最简单的广式镬气' },
  { id: 'd203', name: '冬瓜薏米老鸭汤', region: '粤菜', flavors: ['清淡'], pops: ['balance', 'sugar', 'lose'], nutrition: { kcal: 210, protein: 20, fat: 10, carb: 9 }, ingredients: ['鸭腿 1 个', '冬瓜 200g', '薏米 20g'], steps: ['鸭腿焯水去油', '与薏米炖 40 分钟', '下冬瓜再炖 15 分钟'], highlight: '岭南祛湿靓汤' },
  { id: 'd204', name: '豉汁蒸排骨（控油）', region: '粤菜', flavors: ['酱香', '咸鲜'], pops: ['muscle', 'balance'], nutrition: { kcal: 350, protein: 26, fat: 20, carb: 12 }, ingredients: ['肋排 200g', '豆豉 8g', '芋头 80g'], steps: ['排骨腌 20 分钟', '垫芋头大火蒸 25 分钟'], highlight: '蒸制锁汁，芋头代部分主食' },

  // ---------- 湘菜 ----------
  { id: 'd301', name: '剁椒蒸鸡胸', region: '湘菜', flavors: ['辣', '咸鲜'], pops: ['lose', 'muscle'], nutrition: { kcal: 230, protein: 35, fat: 6, carb: 6 }, ingredients: ['鸡胸 180g', '剁椒 15g', '蒜末'], steps: ['鸡胸片薄铺盘', '盖剁椒大火蒸 10 分钟', '撒葱花淋少许热油'], highlight: '湘味剁椒 + 健身刚需' },
  { id: 'd302', name: '农家小炒肉（少油）', region: '湘菜', flavors: ['辣', '酱香'], pops: ['balance', 'muscle'], nutrition: { kcal: 340, protein: 22, fat: 20, carb: 12 }, ingredients: ['猪里脊 120g', '螺丝椒 100g', '豆豉 5g'], steps: ['辣椒干煸出虎皮', '肉片滑炒断生', '合炒加豆豉酱油'], highlight: '下饭神器，控油控量' },

  // ---------- 鲁菜 ----------
  { id: 'd401', name: '葱烧海参（家庭版用鹌鹑蛋替代）', region: '鲁菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'muscle'], nutrition: { kcal: 260, protein: 24, fat: 12, carb: 12 }, ingredients: ['鹌鹑蛋 6 个', '大葱 1 根', '蚝油 5g'], steps: ['鹌鹑蛋煮熟剥壳煎黄', '葱段煸香加高汤', '入蛋烧至收汁'], highlight: '经典葱香，平价复刻' },
  { id: 'd402', name: '糖醋里脊（空气炸锅版）', region: '鲁菜', flavors: ['甜', '酸'], pops: ['balance'], nutrition: { kcal: 380, protein: 24, fat: 10, carb: 44 }, ingredients: ['里脊 180g', '蛋液', '糖 15g', '醋 15ml'], steps: ['里脊条裹粉空气炸锅 200°C 12 分钟', '糖醋汁熬稠翻裹'], highlight: '少油版鲁菜名品' },

  // ---------- 苏浙菜 ----------
  { id: 'd501', name: '西湖牛肉羹', region: '苏浙菜', flavors: ['咸鲜', '清淡'], pops: ['balance', 'sugar', 'lose'], nutrition: { kcal: 220, protein: 22, fat: 8, carb: 14 }, ingredients: ['牛里脊末 80g', '嫩豆腐 80g', '蛋清 1 个', '香菜'], steps: ['高汤烧开下牛肉末', '下豆腐碎勾芡', '淋蛋清成蛋花'], highlight: '杭帮暖胃羹，低脂高蛋白' },
  { id: 'd502', name: '龙井虾仁', region: '苏浙菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'sugar'], nutrition: { kcal: 240, protein: 30, fat: 7, carb: 10 }, ingredients: ['虾仁 200g', '龙井茶 3g', '蛋清少许'], steps: ['虾仁上浆', '茶水泡开留叶', '滑炒虾仁烹茶汁'], highlight: '江南时令名菜，茶香解腻' },
  { id: 'd503', name: '腌笃鲜（减脂版）', region: '苏浙菜', flavors: ['咸鲜', '清淡'], pops: ['balance'], nutrition: { kcal: 300, protein: 26, fat: 15, carb: 10 }, ingredients: ['鲜排骨 150g', '春笋 100g', '百叶结 50g', '少量咸肉 20g'], steps: ['排骨焯水', '与笋同炖 40 分钟', '加咸肉百叶再炖 20 分钟'], highlight: '江南春鲜，咸肉减量控钠' },

  // ---------- 闽菜 ----------
  { id: 'd601', name: '番茄鱼（改良酸汤）', region: '闽菜', flavors: ['酸', '甜', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'sugar'], nutrition: { kcal: 280, protein: 30, fat: 11, carb: 14 }, ingredients: ['巴沙鱼 200g', '番茄 2 个', '番茄酱 10g'], steps: ['番茄炒出沙', '加水煮开下鱼片', '煮 3 分钟调味'], highlight: '酸甜开胃，无辣党友好' },
  { id: 'd602', name: '荔枝肉（烤箱版）', region: '闽菜', flavors: ['甜', '酸'], pops: ['balance'], nutrition: { kcal: 360, protein: 24, fat: 12, carb: 38 }, ingredients: ['里脊 180g', '马蹄 50g', '糖醋汁'], steps: ['里脊打花刀切块炸', '糖醋汁收裹'], highlight: '闽菜甜口代表作' },

  // ---------- 徽菜 ----------
  { id: 'd701', name: '笋干烧鸡（少油）', region: '徽菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'muscle'], nutrition: { kcal: 340, protein: 30, fat: 16, carb: 14 }, ingredients: ['鸡腿肉 180g', '笋干 60g', '八角 1 颗'], steps: ['笋干泡发', '鸡肉煸炒出油', '加笋干焖 25 分钟'], highlight: '山笋吸油，越炖越香' },
  { id: 'd702', name: '火腿炖冬瓜', region: '徽菜', flavors: ['咸鲜', '清淡'], pops: ['lose', 'sugar', 'balance'], nutrition: { kcal: 150, protein: 12, fat: 8, carb: 7 }, ingredients: ['火腿 25g', '冬瓜 300g'], steps: ['火腿片煸香', '加冬瓜炖 15 分钟'], highlight: '徽式清炖，低卡饱腹' },

  // ---------- 东北菜 ----------
  { id: 'd801', name: '改良地三鲜（烤制）', region: '东北菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'sugar'], nutrition: { kcal: 260, protein: 6, fat: 12, carb: 30 }, ingredients: ['土豆 1 个', '茄子 1 根', '青椒 1 个'], steps: ['三种蔬菜切块烤 200°C 15 分钟', '蒜香酱汁翻拌'], highlight: '油炸改烘烤，热量砍半' },
  { id: 'd802', name: '酸菜炖豆腐', region: '东北菜', flavors: ['酸', '咸鲜'], pops: ['lose', 'balance', 'sugar'], nutrition: { kcal: 200, protein: 14, fat: 9, carb: 14 }, ingredients: ['东北酸菜 150g', '北豆腐 200g', '粉条 30g'], steps: ['酸菜拧干炒香', '加豆腐粉条炖 15 分钟'], highlight: '发酵酸香助消化' },

  // ---------- 西北 ----------
  { id: 'd901', name: '兰州牛肉面（清汤版）', region: '西北面食', flavors: ['辣', '咸鲜'], pops: ['muscle', 'balance'], nutrition: { kcal: 480, protein: 24, fat: 10, carb: 74 }, ingredients: ['拉面 150g', '牛肉 60g', '萝卜片', '香菜蒜苗', '油泼辣子 3g'], steps: ['牛肉汤煮面', '铺牛肉萝卜片', '淋辣子撒香菜'], highlight: '一清二白三红四绿' },
  { id: 'd902', name: '孜然烤羊排（空气炸锅）', region: '西北面食', flavors: ['辣', '咸鲜'], pops: ['muscle'], nutrition: { kcal: 420, protein: 30, fat: 26, carb: 8 }, ingredients: ['羊排 250g', '孜然粉', '辣椒面', '洋葱'], steps: ['羊排腌 1 小时', '空气炸锅 190°C 20 分钟', '撒孜然辣椒面'], highlight: '西北豪情，烤制少油' },

  // ---------- 午晚餐 · 家常 ----------
  { id: 'd1001', name: '西兰花炒鸡胸', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['lose', 'muscle', 'balance'], nutrition: { kcal: 280, protein: 34, fat: 9, carb: 12 }, ingredients: ['鸡胸 160g', '西兰花 150g', '蒜末'], steps: ['鸡胸切片腌制滑炒', '西兰花焯水', '合炒调味'], highlight: '健身餐黄金组合' },
  { id: 'd1002', name: '番茄炒蛋（控糖版）', region: '家常菜', flavors: ['甜', '咸鲜'], pops: ['balance', 'sugar', 'lose'], nutrition: { kcal: 220, protein: 12, fat: 14, carb: 10 }, ingredients: ['番茄 2 个', '鸡蛋 2 个', '代糖 2g'], steps: ['鸡蛋炒散盛出', '番茄炒出汁', '合炒少糖'], highlight: '国民下饭菜的健康版' },
  { id: 'd1003', name: '杂粮饭配清炒时蔬', region: '家常菜', flavors: ['清淡'], pops: ['balance', 'lose', 'sugar'], nutrition: { kcal: 310, protein: 8, fat: 5, carb: 58 }, ingredients: ['三色糙米 70g', '时蔬 200g', '蒜末'], steps: ['杂粮提前浸泡煮饭', '时蔬大火快炒'], highlight: '低 GI 主食打底' },
  { id: 'd1004', name: '香煎三文鱼配芦笋', region: '家常菜', flavors: ['咸鲜'], pops: ['balance', 'muscle', 'lose'], nutrition: { kcal: 380, protein: 32, fat: 22, carb: 8 }, ingredients: ['三文鱼 150g', '芦笋 100g', '柠檬'], steps: ['鱼皮朝下煎 3 分钟', '翻面再煎 2 分钟', '芦笋同锅炒熟挤柠檬'], highlight: '优质 Omega-3' },
  { id: 'd1005', name: '凉拌鸡丝荞麦面', region: '家常菜', flavors: ['酸', '辣', '清淡'], pops: ['lose', 'muscle', 'sugar'], nutrition: { kcal: 340, protein: 26, fat: 8, carb: 42 }, ingredients: ['荞麦面 80g', '鸡胸 100g', '黄瓜丝', '油辣子 3g', '醋 8ml'], steps: ['鸡胸煮熟撕丝', '荞麦面煮 4 分钟过凉', '加料汁拌匀'], highlight: '低 GI 主食 + 双蛋白' },
  { id: 'd1006', name: '香菇滑鸡煲仔饭（少油）', region: '家常菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'muscle'], nutrition: { kcal: 520, protein: 24, fat: 12, carb: 78 }, ingredients: ['鸡腿肉 120g', '香菇 5 朵', '丝苗米 80g', '青菜'], steps: ['米入砂锅焖 10 分钟', '铺鸡肉香菇再焖 10 分钟', '淋少量豉油'], highlight: '锅巴香气的控油版' },

  // ---------- 加餐 ----------
  { id: 'd1101', name: '希腊酸奶莓果杯', region: '家常菜', flavors: ['酸', '甜'], pops: ['lose', 'muscle', 'sugar'], nutrition: { kcal: 160, protein: 15, fat: 4, carb: 16 }, ingredients: ['希腊酸奶 150g', '蓝莓 50g', '坚果碎 5g'], steps: ['酸奶入杯', '铺莓果撒坚果碎'], highlight: '加餐蛋白质补给' },
  { id: 'd1102', name: '水煮蛋 + 圣女果', region: '家常菜', flavors: ['清淡'], pops: ['lose', 'balance', 'muscle'], nutrition: { kcal: 120, protein: 9, fat: 7, carb: 5 }, ingredients: ['鸡蛋 1 个', '圣女果 8 颗'], steps: ['蛋煮 8 分钟', '配圣女果带走即食'], highlight: '零门槛快手加餐' }
]

/** 按条件筛选候选菜 */
export function filterDishes(pop: string, meal: 'breakfast' | 'lunch' | 'dinner'): Dish[] {
  const isBreakfast = meal === 'breakfast'
  return DISHES.filter((d) => {
    if (isBreakfast) return d.nutrition.kcal <= 400
    return !['d001', 'd002', 'd003', 'd004', 'd005', 'd1101', 'd1102'].includes(d.id)
  }).filter((d) => d.pops.includes(pop as never) || pop === 'balance')
}
