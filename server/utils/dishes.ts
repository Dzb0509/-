import type { Dish, PopulationId } from '~/types/recommend'

/**
 * 菜品库（种子数据）：覆盖八大菜系 + 地域家常 + 特殊人群专供菜。
 * 人群标签对应 types/recommend.ts 的两级结构：
 *   成年人(balance/lose/muscle/sugar) · 老年人(elderly/hypertension/diabetes/hyperlipid)
 *   儿童(child) · 婴幼儿(infant/toddler) · 孕产(pregnant/lactation)
 * 做法步骤可被 dishes-detail.json（AI 生成的超详细教程）覆盖。
 */
import detailSteps from './dishes-detail.json'
import generatedJson from './dishes-generated.json'

const RAW_HANDWRITTEN: Dish[] = [
  // ---------- 早餐 ----------
  { id: 'd001', name: '燕麦牛奶粥', region: '家常菜', flavors: ['清淡'], pops: ['balance', 'lose', 'sugar', 'muscle', 'child', 'pregnant', 'elderly', 'toddler', 'diabetes', 'hyperlipid', 'hypertension', 'lactation'], nutrition: { kcal: 280, protein: 12, fat: 7, carb: 42 }, ingredients: ['燕麦片 40g', '纯牛奶 250ml', '奇亚籽 5g', '水 200ml'], steps: ['小锅加 200ml 水烧开，倒入燕麦片转小火', '煮 5 分钟并不时搅拌防粘底，至燕麦吸水变稠', '倒入牛奶转小火再煮 2 分钟，关火焖 1 分钟更绵滑', '盛出撒奇亚籽；喜甜可加半根香蕉压泥代替糖'], highlight: '低 GI 慢碳，饱腹感强，全家都能吃' },
  { id: 'd002', name: '全麦鸡蛋三明治', region: '家常菜', flavors: ['清淡'], pops: ['balance', 'lose', 'muscle', 'child', 'pregnant', 'hyperlipid', 'lactation', 'toddler'], nutrition: { kcal: 320, protein: 18, fat: 12, carb: 34 }, ingredients: ['全麦面包 2 片', '鸡蛋 1 个', '生菜 2 片', '番茄 2 片', '低脂芝士 1 片(可选)'], steps: ['鸡蛋冷水下锅，水开后煮 8 分钟，过凉水剥壳切片', '平底锅不加油把面包片烙 30 秒至微脆', '按 面包→生菜→番茄→蛋片→(芝士)→面包 叠放', '保鲜膜裹紧对角切开，断面更整齐也方便携带'], highlight: '优质蛋白+全麦纤维，上学上班都好带' },
  { id: 'd003', name: '广式虾仁肠粉', region: '粤菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'sugar', 'child', 'pregnant', 'elderly', 'toddler', 'hyperlipid', 'hypertension'], nutrition: { kcal: 300, protein: 15, fat: 6, carb: 46 }, ingredients: ['肠粉预拌粉 80g', '鲜虾仁 60g', '生抽 5ml', '白糖 2g', '葱花少许', '水 200ml'], steps: ['预拌粉按 1:2.5 加水调成米浆，静置 5 分钟', '平盘刷薄油，倒入米浆轻晃铺满，撒虾仁', '蒸锅水开后大火蒸 3 分钟，起大泡即熟', '刮板从一端卷起切段；生抽+糖+热水调成豉油汁淋上'], highlight: '广式经典，蒸制少油，软糯好消化' },
  { id: 'd004', name: '小米南瓜粥', region: '家常菜', flavors: ['清淡', '甜'], pops: ['balance', 'sugar', 'child', 'pregnant', 'elderly', 'infant', 'toddler', 'hypertension', 'diabetes', 'hyperlipid', 'lactation'], nutrition: { kcal: 220, protein: 6, fat: 2, carb: 45 }, ingredients: ['小米 50g', '南瓜 100g', '水 800ml'], steps: ['小米淘洗 2 遍，南瓜去皮切 1.5cm 小块', '冷水下锅大火烧开，转小火盖盖留缝', '熬 25 分钟至米油浮面、南瓜半化，中途搅 2 次', '喜稠可再焖 5 分钟；老人小孩吃可压成细腻糊状'], highlight: '养胃缓释碳水，早餐夜宵都合适' },
  { id: 'd005', name: '京味鸡蛋灌饼（改良）', region: '家常菜', flavors: ['咸鲜'], pops: ['muscle', 'balance', 'child'], nutrition: { kcal: 380, protein: 16, fat: 14, carb: 45 }, ingredients: ['全麦饼坯 1 张', '鸡蛋 1 个', '生菜 2 片', '甜面酱 5g'], steps: ['冷冻饼坯无需解冻，平底锅小火干烙至鼓起大包', '筷子戳开鼓包倒入打散的蛋液，翻面再烙 1 分钟', '两面烙至金黄出麦香，全程小火防糊', '抹薄酱卷生菜，对切装盘'], highlight: '训练前碳水源，10 分钟快手早餐' },
  { id: 'd006', name: '南瓜苹果米糊（婴儿辅食）', region: '家常菜', flavors: ['甜', '清淡'], pops: ['infant', 'toddler'], nutrition: { kcal: 120, protein: 2, fat: 1, carb: 26 }, ingredients: ['婴儿强化铁米粉 20g', '南瓜 40g', '苹果 30g', '温水 120ml'], steps: ['南瓜去皮切薄片，大火蒸 10 分钟至筷子轻松穿透', '苹果去皮去核切小块，与蒸好的南瓜一起压成细泥', '米粉按说明书比例用 60°C 温水调开，静置 1 分钟成糊', '拌入南瓜苹果泥，总体呈酸奶状稠度；6 月龄初尝需过筛更细', '⚠️ 全程不加盐糖蜂蜜（1 岁内禁蜂蜜），现做现吃不隔顿'], highlight: '强化铁米粉打底，6 月龄+的第一口辅食' },
  { id: 'd007', name: '猪肝菠菜碎软粥（补铁辅食）', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['infant', 'toddler', 'pregnant', 'elderly'], nutrition: { kcal: 180, protein: 8, fat: 3, carb: 30 }, ingredients: ['大米 30g', '猪肝 20g', '菠菜叶 20g', '姜 1 片'], steps: ['大米淘洗后加水 8 倍，大火烧开转小火熬 35 分钟至开花', '猪肝切薄片用清水浸泡 30 分钟去血水（中途换水 2 次）', '猪肝与姜片冷水下锅煮 5 分钟至熟透，捞出压成细茸', '菠菜叶焯水 30 秒去除草酸，挤干切碎末', '肝茸与菜末拌入粥中再煮 2 分钟；1 岁内不加盐，靠食材本味'], highlight: '血红素铁+维C 菠菜同碗，贫血宝宝每周 2 次' },
  { id: 'd008', name: '牛奶蒸蛋羹（幼儿早餐）', region: '家常菜', flavors: ['清淡', '甜'], pops: ['toddler', 'infant', 'elderly', 'child'], nutrition: { kcal: 160, protein: 10, fat: 8, carb: 10 }, ingredients: ['鸡蛋 1 个', '配方奶或纯牛奶 100ml', '温水 30ml'], steps: ['鸡蛋打散，加入 40°C 左右的奶液与温水（蛋:液=1:1.5）', '过筛 2 遍入蒸碗，撇去表面气泡（气泡是孔洞的来源）', '盖保鲜膜扎 3 个小孔，水开后中火蒸 7 分钟', '关火焖 2 分钟再开盖，表面如布丁般光滑；滴香油增香'], highlight: '1 岁+ 幼儿蛋白质早餐，入口即化' },

  // ---------- 川菜 ----------
  { id: 'd101', name: '轻油版麻婆豆腐', region: '川菜', flavors: ['麻', '辣', '咸鲜'], pops: ['balance', 'muscle'], nutrition: { kcal: 260, protein: 18, fat: 14, carb: 12 }, ingredients: ['嫩豆腐 300g', '牛肉末 40g', '郫县豆瓣 10g', '花椒粉 2g', '蒜苗 1 根', '水淀粉 15ml'], steps: ['豆腐切 2cm 方块，加盐开水焯 1 分钟定型去豆腥', '1 勺油小火炒牛肉末至酥香，下豆瓣炒出红油', '加半碗热水下豆腐，中火烧 3 分钟轻推别翻碎', '分两次勾芡（汤汁浓稠挂得住才亮），撒花椒粉和蒜苗末'], highlight: '植物蛋白大户，控油版减 40% 油' },
  { id: 'd102', name: '水煮鱼片（少油版）', region: '川菜', flavors: ['辣', '麻', '咸鲜'], pops: ['muscle', 'balance'], nutrition: { kcal: 320, protein: 34, fat: 15, carb: 10 }, ingredients: ['黑鱼片 200g', '豆芽 100g', '干辣椒 5g', '花椒 2g', '蛋清半个', '淀粉 8g'], steps: ['鱼片加盐、料酒、蛋清、淀粉抓匀上浆，腌 15 分钟', '鱼片入 80°C 热水滑散变色即捞（约 1 分钟），比滑油少 20g 油', '豆芽焯熟垫碗底，铺鱼片浇少量热汤汁', '干辣椒花椒铺面，1 勺热油「刺啦」激香即成'], highlight: '高蛋白低脂，辣而不腻的川味经典' },
  { id: 'd103', name: '鱼香鸡丝（免油版）', region: '川菜', flavors: ['辣', '甜', '酸'], pops: ['balance', 'muscle'], nutrition: { kcal: 290, protein: 28, fat: 10, carb: 18 }, ingredients: ['鸡胸肉 150g', '木耳 30g', '胡萝卜 30g', '泡椒 10g', '糖 3g', '醋 5ml', '生抽 5ml'], steps: ['鸡胸顺纹切丝，加盐料酒淀粉腌 10 分钟', '不粘锅少油滑炒鸡丝至变白盛出', '余油爆香泡椒姜蒜末，下木耳胡萝卜丝炒 1 分钟', '回锅鸡丝，烹入糖醋生抽兑的鱼香汁，大火翻匀收汁'], highlight: '把经典鱼香做出低脂版，酸甜微辣' },
  { id: 'd104', name: '凉拌折耳根', region: '川菜', flavors: ['酸', '辣'], pops: ['lose', 'balance'], nutrition: { kcal: 70, protein: 2, fat: 3, carb: 8 }, ingredients: ['折耳根 150g', '糊辣椒面 2g', '香菜 1 根', '醋 5ml', '生抽 3ml'], steps: ['折耳根掐成段，盐水浸泡 5 分钟后冲洗沥干', '加糊辣椒面、香菜、蒜末', '生抽醋糖按 3:5:1 调汁淋上', '拌匀静置 3 分钟入味再吃，脆嫩带鱼腥香'], highlight: '云贵川特色野菜，膳食纤维满分' },
  { id: 'd105', name: '洋葱醋拌黑木耳（降压降脂）', region: '川菜', flavors: ['酸', '清淡'], pops: ['hypertension', 'hyperlipid', 'diabetes', 'lose', 'elderly', 'balance'], nutrition: { kcal: 90, protein: 2, fat: 4, carb: 12 }, ingredients: ['干黑木耳 10g', '紫洋葱 半个', '香醋 10ml', '生抽(低钠) 5ml', '小米辣(可选) 少许'], steps: ['干木耳冷水泡发 2 小时（急用可温水 30 分钟），去蒂撕小朵', '水开焯 2 分钟捞出过凉开水，口感更脆', '洋葱切细丝冰水浸 5 分钟去辛辣', '木耳洋葱加香醋、低钠生抽、几滴香油拌匀静置 10 分钟', '全程不用盐：香醋与低钠生抽提味，钠摄入减半'], highlight: '木耳多糖+洋葱槲皮素，高血压高血脂的黄金凉菜' },
  { id: 'd106', name: '芹菜炒香干（低钠高钾）', region: '家常菜', flavors: ['咸鲜', '清淡'], pops: ['hypertension', 'elderly', 'balance', 'hyperlipid', 'diabetes'], nutrition: { kcal: 150, protein: 10, fat: 7, carb: 10 }, ingredients: ['香芹 200g', '香干 100g', '蒜片 5g', '生抽(低钠) 5ml'], steps: ['芹菜撕去老筋斜刀切段（斜切更入味），香干切细条', '芹菜大火焯水 40 秒（加点盐底味），过凉沥干', '少油小火煎香干条至两面微黄起泡', '下蒜片芹菜大火 1 分钟，淋低钠生抽翻匀出锅', '芹菜叶别扔：维生素是茎的 3 倍，可以最后撒进去'], highlight: '每 100g 芹菜含钾 260mg，天然「降压菜」' },

  // ---------- 粤菜 ----------
  { id: 'd201', name: '清蒸鲈鱼', region: '粤菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'sugar', 'child', 'pregnant', 'elderly', 'hypertension', 'hyperlipid', 'toddler', 'lactation'], nutrition: { kcal: 240, protein: 32, fat: 9, carb: 4 }, ingredients: ['鲈鱼 1 条(约400g)', '姜丝 10g', '葱丝 15g', '蒸鱼豉油 10ml', '食用油 5ml'], steps: ['鱼身两面划 3 刀，抹少许盐和料酒，塞姜丝腌 10 分钟', '蒸锅水大开后入锅，大火足汽蒸 8 分钟（500g 左右为准）', '倒掉盘中腥水弃姜丝，铺新葱丝', '烧 5ml 热油浇在葱丝上激香，沿盘边淋豉油——别直接淋鱼身'], highlight: '粤菜代表作，高蛋白标杆，DHA 助力胎儿大脑' },
  { id: 'd202', name: '白灼菜心', region: '粤菜', flavors: ['清淡'], pops: ['balance', 'lose', 'sugar', 'child', 'pregnant', 'elderly', 'hypertension', 'diabetes', 'hyperlipid', 'toddler'], nutrition: { kcal: 80, protein: 3, fat: 4, carb: 8 }, ingredients: ['菜心 250g', '生抽 5ml', '白糖 1g', '蒜片 5g'], steps: ['水开加 3g 盐几滴油（保持翠绿的关键）', '菜心大火灼 1 分钟，梗粗可先下梗 20 秒', '捞出过一下冰水更爽脆，摆盘', '生抽+糖+2 勺灼菜水+蒜片调成味汁淋上'], highlight: '最简单的广式镬气，30 秒保留全部维生素' },
  { id: 'd203', name: '冬瓜薏米老鸭汤', region: '粤菜', flavors: ['清淡'], pops: ['balance', 'sugar', 'lose', 'elderly', 'pregnant', 'hypertension', 'hyperlipid'], nutrition: { kcal: 210, protein: 20, fat: 10, carb: 9 }, ingredients: ['鸭腿 1 个', '冬瓜 200g', '薏米 20g', '姜 3 片', '陈皮 1 小块'], steps: ['薏米提前泡 1 小时；鸭腿剁块冷水下锅焯出血沫', '鸭块、薏米、姜片、陈皮入砂锅，加足量热水', '大火烧开转小火炖 40 分钟', '下冬瓜块再炖 15 分钟至透明，关火前 5 分钟才加盐'], highlight: '岭南祛湿靓汤，孕晚期水肿也适合' },
  { id: 'd204', name: '豉汁蒸排骨（控油）', region: '粤菜', flavors: ['酱香', '咸鲜'], pops: ['muscle', 'balance', 'child'], nutrition: { kcal: 350, protein: 26, fat: 20, carb: 12 }, ingredients: ['肋排 200g', '豆豉 8g', '芋头 80g', '蒜末 5g', '生抽 5ml', '淀粉 5g'], steps: ['排骨斩小段泡水 20 分钟去血水，沥干', '加豆豉(剁碎)、蒜末、生抽、糖、淀粉抓匀腌 20 分钟', '芋头切滚刀块垫盘底，铺上排骨', '水开后大火蒸 25 分钟，撒葱花再焖 1 分钟'], highlight: '蒸制锁汁不油炸，芋头垫底还替代部分主食' },
  { id: 'd205', name: '海带豆腐汤（高钾降压）', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['hypertension', 'hyperlipid', 'elderly', 'balance', 'lose', 'diabetes'], nutrition: { kcal: 130, protein: 10, fat: 5, carb: 10 }, ingredients: ['泡发海带 100g', '北豆腐 200g', '姜片 2 片', '香油 2 滴'], steps: ['海带泡发后洗净切菱形片；豆腐切 2cm 块', '清水 600ml 加姜片烧开，先下海带中火煮 8 分钟', '下豆腐块转小火再煮 5 分钟（久煮豆腐变孔吸汤更好吃）', '出锅前滴香油，不加盐或仅加 1g——海带自带谷氨酸鲜味'], highlight: '高钾低钠组合，高血压人群每周吃 3 次的汤' },

  // ---------- 湘菜 ----------
  { id: 'd301', name: '剁椒蒸鸡胸', region: '湘菜', flavors: ['辣', '咸鲜'], pops: ['lose', 'muscle'], nutrition: { kcal: 230, protein: 35, fat: 6, carb: 6 }, ingredients: ['鸡胸 180g', '剁椒 15g', '蒜末 5g', '蒸鱼豉油 5ml'], steps: ['鸡胸斜刀片成 3 片（厚薄一致才同步熟），拍松', '加料酒姜丝抓匀去腥 10 分钟', '每片抹薄薄一层剁椒，大火蒸 10 分钟', '倒掉多余汤汁，淋豉油、撒葱花、点几滴热油'], highlight: '湘味剁椒+健身刚需，蒸出来的低脂高蛋白' },
  { id: 'd302', name: '农家小炒肉（少油）', region: '湘菜', flavors: ['辣', '酱香'], pops: ['balance', 'muscle'], nutrition: { kcal: 340, protein: 22, fat: 20, carb: 12 }, ingredients: ['猪里脊 120g', '螺丝椒 100g', '豆豉 5g', '蒜片 5g', '生抽 5ml'], steps: ['里脊切薄片，加生抽淀粉抓匀；螺丝椒斜切段拍扁', '干锅下辣椒按压煸出虎皮斑，盛出', '少油滑炒肉片至八成熟，下豆豉蒜片爆香', '辣椒回锅，大火 30 秒合炒，沿锅边淋生抽出锅'], highlight: '下饭神器，里脊替代五花肉控油控量' },
  { id: 'd303', name: '山药木耳炒肉片（低脂高纤）', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['hyperlipid', 'elderly', 'balance', 'hypertension', 'diabetes'], nutrition: { kcal: 210, protein: 16, fat: 9, carb: 16 }, ingredients: ['铁棍山药 150g', '水发木耳 50g', '猪里脊 80g', '蒜片 5g'], steps: ['山药戴手套削皮切菱形片，泡清水防氧化发黑', '里脊切薄片加淀粉料酒抓匀腌 10 分钟', '水开焯山药木耳各 1 分钟捞出（缩短炒制时间）', '少油滑炒肉片变白，下山药木耳蒜片大火翻 1 分钟', '淋低钠生抽+几滴醋提鲜，不加糖——控脂控糖双达标'], highlight: '黏蛋白+木耳多糖，血管减负的一盘菜' },

  // ---------- 鲁菜 ----------
  { id: 'd401', name: '葱烧鹌鹑蛋（家常版葱烧）', region: '鲁菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'muscle', 'child', 'elderly', 'toddler'], nutrition: { kcal: 260, protein: 24, fat: 12, carb: 12 }, ingredients: ['鹌鹑蛋 6 个', '大葱 1 根', '蚝油 5g', '生抽 5ml', '高汤或水 100ml'], steps: ['鹌鹑蛋煮 6 分钟过凉水剥壳，表面轻划两刀更入味', '不粘锅少油把蛋煎出虎皮纹', '大葱切 5cm 段，用锅中余油煸至焦边出葱香', '加高汤、蚝油、生抽，入蛋小火烧 5 分钟收汁'], highlight: '经典葱烧技法的平价复刻' },
  { id: 'd402', name: '糖醋里脊（空气炸锅版）', region: '鲁菜', flavors: ['甜', '酸'], pops: ['balance', 'child', 'toddler'], nutrition: { kcal: 380, protein: 24, fat: 10, carb: 44 }, ingredients: ['里脊 180g', '蛋液半个', '淀粉 30g', '糖 15g', '醋 15ml', '番茄酱 10g'], steps: ['里脊切 1.5cm 宽条，盐料酒腌 10 分钟', '裹蛋液再滚干淀粉，静置回潮 2 分钟（炸壳不脱的关键）', '空气炸锅 200°C 喷层油，炸 12 分钟中途翻面', '糖醋汁(糖:醋:番茄酱:水=1.5:1.5:1:3)熬至冒大泡，倒入里脊快速裹匀'], highlight: '孩子最爱的鲁菜名品，少油不腻' },
  { id: 'd403', name: '清炒苦瓜（低GI控糖）', region: '家常菜', flavors: ['清淡', '苦'], pops: ['diabetes', 'sugar', 'balance', 'lose', 'elderly'], nutrition: { kcal: 70, protein: 2, fat: 4, carb: 8 }, ingredients: ['苦瓜 1 根', '蒜片 8g', '枸杞 10 粒', '盐 1g'], steps: ['苦瓜对半剖开，用小勺把白瓤刮得越干净越不苦', '斜刀切 2mm 薄片，加盐抓匀腌 5 分钟，挤去苦水', '沸水焯 30 秒立刻过冰水（保脆保绿双重保险）', '少油大火蒜片爆香，下苦瓜快速翻 40 秒，撒枸杞出锅', '不喜苦味可配少许红椒丝调和，焯水时间别超 1 分钟'], highlight: '苦瓜皂苷被称为「植物胰岛素」，糖尿病餐盘常客' },

  // ---------- 苏浙菜 ----------
  { id: 'd501', name: '西湖牛肉羹', region: '苏浙菜', flavors: ['咸鲜', '清淡'], pops: ['balance', 'sugar', 'lose', 'child', 'pregnant', 'elderly', 'hypertension', 'toddler'], nutrition: { kcal: 220, protein: 22, fat: 8, carb: 14 }, ingredients: ['牛里脊末 80g', '嫩豆腐 80g', '蛋清 1 个', '香菜末', '姜末 3g'], steps: ['牛肉末加料酒姜末抓开；豆腐切 5mm 小丁', '400ml 高汤烧开下牛肉末滑散，撇浮沫', '下豆腐丁煮 2 分钟，水淀粉勾薄芡至汤能挂勺', '最小火绕圈淋蛋清成蛋花，关火撒香菜——顺序错了会成蛋块'], highlight: '杭帮暖胃羹，软嫩无渣老人孩子都好吸收' },
  { id: 'd502', name: '龙井虾仁', region: '苏浙菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'sugar', 'pregnant', 'hypertension', 'hyperlipid'], nutrition: { kcal: 240, protein: 30, fat: 7, carb: 10 }, ingredients: ['虾仁 200g', '龙井茶 3g', '蛋清半个', '淀粉 5g', '热水 150ml'], steps: ['虾仁开背去线，厨房纸吸干水分（上浆不脱的关键）', '加盐、蛋清、淀粉抓至发黏，冷藏腌 30 分钟', '80°C 热水滑虾仁至弯曲变红捞出，约 40 秒', '龙井茶 80°C 泡开，取 50ml 茶水+茶叶入锅，下虾仁轻翻裹汁'], highlight: '江南时令名菜，茶香解腻，孕吐期也好入口' },
  { id: 'd503', name: '腌笃鲜（减脂版）', region: '苏浙菜', flavors: ['咸鲜', '清淡'], pops: ['balance', 'elderly'], nutrition: { kcal: 300, protein: 26, fat: 15, carb: 10 }, ingredients: ['鲜排骨 150g', '春笋 100g', '百叶结 50g', '咸肉 20g', '葱结 1 个'], steps: ['排骨焯水；咸肉温水洗切薄片；春笋切滚刀块焯水去草酸', '排骨+咸肉+葱结入砂锅加足量热水', '大火烧开转小火笃 40 分钟（"笃"就是咕嘟声）', '下笋和百叶结再笃 20 分钟，咸肉自带咸味，尝过再决定加不加盐'], highlight: '江南春鲜一锅端，咸肉减量控钠不输风味' },
  { id: 'd504', name: '番茄龙利鱼（无刺软嫩）', region: '家常菜', flavors: ['酸', '甜', '咸鲜'], pops: ['toddler', 'child', 'elderly', 'hypertension', 'balance', 'lactation', 'pregnant', 'infant'], nutrition: { kcal: 230, protein: 26, fat: 9, carb: 12 }, ingredients: ['龙利鱼柳 200g', '番茄 1 个', '番茄酱 5g', '蛋清半个', '淀粉 5g'], steps: ['鱼柳切 2.5cm 块，用厨房纸吸干后加蛋清淀粉轻抓匀（1 岁内宝宝份先盛出）', '番茄顶划十字用开水烫 1 分钟去皮，切丁', '少油小火炒番茄丁至完全出沙，加番茄酱与半碗水煮开', '下鱼块中火煮 4 分钟，汤汁浓稠即可；宝宝吃的份压成小碎块拌饭'], highlight: '零鱼刺高蛋白，从婴儿到老人一锅通吃的宝藏菜' },

  // ---------- 闽菜 ----------
  { id: 'd601', name: '番茄鱼（改良酸汤）', region: '闽菜', flavors: ['酸', '甜', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'sugar', 'child', 'pregnant', 'toddler', 'hypertension', 'hyperlipid', 'lactation'], nutrition: { kcal: 280, protein: 30, fat: 11, carb: 14 }, ingredients: ['巴沙鱼 200g', '番茄 2 个', '番茄酱 10g', '蛋清半个', '淀粉 5g'], steps: ['鱼片加盐蛋清淀粉腌 15 分钟；番茄顶划十字烫去皮切丁', '少油炒番茄丁至出沙成糊，加番茄酱炒出红油', '加 400ml 热水煮开，转中小火', '逐片下鱼片煮 3 分钟至变白，加盐糖调味，撒葱花'], highlight: '酸甜开胃无刺安全，孕吐和挑食孩子的救星' },
  { id: 'd602', name: '荔枝肉（烤箱版）', region: '闽菜', flavors: ['甜', '酸'], pops: ['balance', 'child', 'toddler'], nutrition: { kcal: 360, protein: 24, fat: 12, carb: 38 }, ingredients: ['里脊 180g', '马蹄 50g', '糖 15g', '醋 15ml', '红糟或番茄酱 8g'], steps: ['里脊剞十字花刀再切 3cm 块（受热卷成荔枝形）', '加红糟、料酒腌 15 分钟上色', '烤箱 200°C 烤 15 分钟（中途翻面）替代油炸', '糖醋汁熬稠，倒肉块和切半的马蹄快速翻裹'], highlight: '闽菜甜口代表作，形似荔枝酸甜酥嫩' },

  // ---------- 徽菜 ----------
  { id: 'd701', name: '笋干烧鸡（少油）', region: '徽菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'muscle'], nutrition: { kcal: 340, protein: 30, fat: 16, carb: 14 }, ingredients: ['鸡腿肉 180g', '笋干 60g', '八角 1 颗', '姜片 3 片', '生抽 8ml'], steps: ['笋干提前泡发 4 小时切段；鸡腿剁块焯水', '干锅煸炒鸡块逼出鸡皮油（不用额外加油）', '下姜八角炒香，加生抽老抽上色', '加热水没过，入笋干小火焖 25 分钟，大火收汁'], highlight: '山笋吸油越炖越香，徽州山家的味道' },
  { id: 'd702', name: '火腿炖冬瓜', region: '徽菜', flavors: ['咸鲜', '清淡'], pops: ['lose', 'sugar', 'balance', 'elderly', 'pregnant', 'diabetes'], nutrition: { kcal: 150, protein: 12, fat: 8, carb: 7 }, ingredients: ['火腿 25g', '冬瓜 300g', '姜片 2 片'], steps: ['火腿切薄片，温水浸泡 10 分钟去多余盐分', '火腿片小火煸出油脂香气', '下冬瓜片翻炒 1 分钟裹上油香', '加 300ml 热水，中火炖 15 分钟至冬瓜透明——火腿够咸无需再加盐'], highlight: '徽式清炖，一碗不到 150 大卡的饱腹汤' },

  // ---------- 东北菜 ----------
  { id: 'd801', name: '改良地三鲜（烤制）', region: '东北菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'sugar', 'child', 'hyperlipid'], nutrition: { kcal: 260, protein: 6, fat: 12, carb: 30 }, ingredients: ['土豆 1 个', '茄子 1 根', '青椒 1 个', '蒜末 10g', '生抽 8ml'], steps: ['土豆茄子切滚刀块，茄子撒盐腌 10 分钟挤水', '三样蔬菜平铺烤盘喷少许油，200°C 烤 15 分钟', '土豆边缘焦黄即可（替代传统过油炸）', '少油爆香蒜末，倒回蔬菜淋生抽糖汁快速翻匀'], highlight: '油炸改烘烤，热量砍半的东北下饭菜' },
  { id: 'd802', name: '酸菜炖豆腐', region: '东北菜', flavors: ['酸', '咸鲜'], pops: ['lose', 'balance', 'sugar', 'elderly'], nutrition: { kcal: 200, protein: 14, fat: 9, carb: 14 }, ingredients: ['东北酸菜 150g', '北豆腐 200g', '粉条 30g', '葱姜少许'], steps: ['酸菜攥干切丝；粉条温水泡软；豆腐切块', '少油炒酸菜丝 2 分钟炒出酸香（这步不能省）', '加热水，下豆腐粉条，中小火炖 15 分钟', '加盐白胡椒调味，撒葱花连汤上桌'], highlight: '发酵酸香助消化，炖菜暖胃又低卡' },

  // ---------- 西北 ----------
  { id: 'd901', name: '兰州牛肉面（清汤版）', region: '西北面食', flavors: ['辣', '咸鲜'], pops: ['muscle', 'balance', 'child'], nutrition: { kcal: 480, protein: 24, fat: 10, carb: 74 }, ingredients: ['拉面 150g', '卤牛肉 60g', '白萝卜 3 片', '香菜蒜苗', '油泼辣子 3g', '牛肉汤 400ml'], steps: ['提前卤好牛肉（或买现成），切薄片', '牛肉汤烧开下白萝卜片煮 2 分钟', '另锅煮面至八成熟捞入汤碗（面和汤分煮汤才清）', '铺牛肉萝卜，浇汤，撒香菜蒜苗，喜辣补一勺辣子——「一清二白三红四绿」'], highlight: '清汤牛肉面，碳水和蛋白质都到位' },
  { id: 'd902', name: '孜然烤羊排（空气炸锅）', region: '西北面食', flavors: ['辣', '咸鲜'], pops: ['muscle'], nutrition: { kcal: 420, protein: 30, fat: 26, carb: 8 }, ingredients: ['羊排 250g', '孜然粉 3g', '辣椒面 2g', '洋葱半个', '料酒 10ml'], steps: ['羊排加洋葱丝、料酒、盐腌 1 小时（过夜更好）', '空气炸锅 190°C 先烤 15 分钟', '翻面再烤 8 分钟至边缘焦脆', '撒孜然辣椒面回炉 2 分钟激香'], highlight: '西北豪情，空气炸锅版少油一半' },

  // ---------- 湖北菜（鄂菜） ----------
  { id: 'd1301', name: '莲藕排骨汤', region: '湖北菜', flavors: ['清淡', '甜'], pops: ['balance', 'elderly', 'pregnant', 'child', 'lactation', 'toddler'], nutrition: { kcal: 340, protein: 20, fat: 14, carb: 24 }, ingredients: ['粉藕 300g', '肋排 200g', '姜 3 片', '小葱少许'], steps: ['排骨冷水下锅焯血沫，捞出用热水冲净（冷水会让肉质发紧）', '粉藕（九孔藕）去皮切滚刀块，撒 1g 盐抓匀腌 10 分钟更粉糯', '排骨、藕块、姜片入砂锅加足量热水，大火烧开', '转小火吊 1 小时，中途不揭盖（汤色奶白的关键）', '关火加盐 2g 撒葱花；汤面浮油可撇掉一半更清爽'], highlight: '湖北人的冬日灵魂，粉藕补碳水排骨补蛋白' },
  { id: 'd1302', name: '清蒸武昌鱼', region: '湖北菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'lose', 'muscle', 'elderly', 'child', 'hypertension', 'hyperlipid', 'pregnant'], nutrition: { kcal: 260, protein: 30, fat: 10, carb: 5 }, ingredients: ['武昌鱼 1 条(约450g)', '姜丝 10g', '葱段 15g', '蒸鱼豉油 10ml', '食用油 5ml'], steps: ['鱼身两面各划 3 刀，料酒抹匀塞姜丝腌 10 分钟去腥', '盘底垫两根葱段把鱼架起来（蒸汽流通受热均匀）', '水大开后上锅大火蒸 9 分钟，关火虚蒸 2 分钟', '倒掉腥水换新葱姜丝，浇 5ml 热油激香，淋豉油上桌'], highlight: '「才饮长江水，又食武昌鱼」，蒸法同鲈鱼但肉质更细' },

  // ---------- 云南菜（滇菜） ----------
  { id: 'd1303', name: '云南汽锅鸡（原味少油）', region: '云南菜', flavors: ['清淡', '咸鲜'], pops: ['balance', 'elderly', 'pregnant', 'child', 'lactation', 'muscle'], nutrition: { kcal: 280, protein: 30, fat: 14, carb: 4 }, ingredients: ['土鸡腿 2 个', '姜片 3 片', '虫草花 5g(可选)', '盐 2g'], steps: ['鸡腿剁块冷水浸泡 20 分钟去血水，捞出沥干', '汽锅底部铺姜块，鸡块码入，不放一滴水', '大蒸锅烧开水，汽锅坐在锅口上，蒸汽沿中柱凝成原汤', '中大火蒸 1.5~2 小时，汤色金黄只有小半锅——全是蒸馏精华', '开盖撒盐 2g 即可，不加味精靠鸡自身鲜味'], highlight: '一滴水不加的全蒸汽汤，鲜味浓度天花板' },

  // ---------- 贵州菜（黔菜） ----------
  { id: 'd1304', name: '贵州酸汤鱼（低脂版）', region: '贵州菜', flavors: ['酸', '辣'], pops: ['lose', 'muscle', 'balance'], nutrition: { kcal: 260, protein: 30, fat: 9, carb: 12 }, ingredients: ['黑鱼片 200g', '红酸汤 80g', '番茄 1 个', '木姜子油 3 滴', '金针菇 80g'], steps: ['鱼片上浆（盐+蛋清+淀粉）腌 15 分钟', '少油炒番茄丁出沙，加红酸汤炒 1 分钟出香', '倒 500ml 热水煮开，先烫金针菇垫碗底', '转小火逐片下鱼片，煮 2 分钟至变白即关火（久煮会碎）', '滴 3 滴木姜子油——黔味灵魂，没有可换几滴柠檬汁'], highlight: '发酵红酸汤开胃促消化，酸辣过瘾却不到 300 大卡' },

  // ---------- 京菜 ----------
  { id: 'd1305', name: '京酱肉丝（豆皮卷）', region: '京菜', flavors: ['酱香', '甜'], pops: ['balance', 'child', 'muscle'], nutrition: { kcal: 330, protein: 24, fat: 14, carb: 20 }, ingredients: ['猪里脊 150g', '干豆腐皮 2 张', '甜面酱 15g', '葱丝 30g', '黄瓜丝 50g'], steps: ['里脊顺纹切细丝，加料酒蛋清淀粉腌 15 分钟', '甜面酱加 10ml 水和半勺糖调开备用', '少油滑炒肉丝至变白盛出；余油小火炒酱至冒泡发亮', '肉丝回锅裹匀酱汁出锅；豆皮铺葱丝黄瓜丝卷着吃', '豆皮替代传统荷叶饼，碳水减半蛋白翻倍'], highlight: '卷饼换豆皮，低脂高蛋白的北京味' },

  // ---------- 新疆菜 ----------
  { id: 'd1306', name: '新疆糙米手抓饭', region: '新疆菜', flavors: ['咸鲜'], pops: ['muscle', 'balance', 'child'], nutrition: { kcal: 460, protein: 22, fat: 12, carb: 68 }, ingredients: ['糙米+大米共 90g', '羊腿肉 80g', '胡萝卜 1 根', '洋葱半个', '葡萄干 10g'], steps: ['糙米提前泡 2 小时（与大米 1:1 混合降低 GI）', '少油煸炒洋葱丝至金黄，下羊肉块炒到表面焦香', '加胡萝卜条、孜然 2g、盐翻炒 1 分钟', '铺米加水没过食材 1cm，小火焖 25 分钟', '撒葡萄干焖 5 分钟，开盖翻拌均匀'], highlight: '传统抓饭换糙米，纤维和饱腹感都升级' },

  // ---------- 客家菜 ----------
  { id: 'd1307', name: '客家酿豆腐（清蒸）', region: '客家菜', flavors: ['咸鲜', '清淡'], pops: ['balance', 'elderly', 'child', 'pregnant', 'toddler', 'hypertension', 'diabetes'], nutrition: { kcal: 240, protein: 20, fat: 12, carb: 10 }, ingredients: ['北豆腐 300g', '猪肉末 80g', '香菇 2 朵', '虾仁 30g', '生抽 5ml'], steps: ['豆腐切 4cm 方块，中间挖小凹（挖出的豆腐拌进馅不浪费）', '肉末+香菇碎+虾仁碎+少许盐搅打上劲', '肉馅填入豆腐凹处抹平，水开上锅', '大火蒸 12 分钟，倒出盘中汤汁勾薄芡回淋', '生抽点蘸代替红烧，控钠不减鲜'], highlight: '客家人「以豆腐代面」的酿菜，清蒸版控油控钠' },

  // ---------- 赣菜（江西） ----------
  { id: 'd1308', name: '藜蒿炒腊肉（减盐版）', region: '赣菜', flavors: ['咸鲜', '清淡'], pops: ['balance', 'lose'], nutrition: { kcal: 240, protein: 14, fat: 14, carb: 10 }, ingredients: ['藜蒿 200g', '腊肉 30g', '干辣椒 2 个', '蒜末 5g'], steps: ['腊肉温水洗一遍再蒸 5 分钟（软化同时逼出多余盐分），切薄片', '藜蒿掐段洗净，沥干水（带水下锅会蔫）', '干锅煸腊肉片出油，下蒜末干辣椒爆香', '大火下藜蒿炒 90 秒断生即出锅——腊肉咸味足够不加盐', '藜蒿脆嫩清香，是鄱阳湖边的「神仙草」'], highlight: '江西头牌时蔬，腊肉减量到 30g 控脂控钠' },

  // ---------- 广西菜（桂菜） ----------
  { id: 'd1309', name: '桂林啤酒鱼（少油版）', region: '广西菜', flavors: ['咸鲜', '辣'], pops: ['balance', 'muscle', 'lose'], nutrition: { kcal: 280, protein: 28, fat: 10, carb: 12 }, ingredients: ['罗非鱼或鲈鱼 1 条(约500g)', '啤酒 200ml', '番茄 1 个', '青椒 1 个', '姜片蒜末'], steps: ['鱼身划刀用盐料酒腌 15 分钟；厨房纸吸干表面', '不粘锅少油把鱼两面煎至金黄定型（约各 2 分钟）', '下姜蒜爆香，倒啤酒 200ml（去腥嫩肉还免加水）', '加番茄块青椒段中火焖 12 分钟，收汁前尝味再补盐'], highlight: '漓江名菜的家庭少油版，啤酒代替油炸去腥' },

  // ---------- 本帮菜（上海） ----------
  { id: 'd1310', name: '油焖茭白（低糖版）', region: '本帮菜', flavors: ['甜', '咸鲜'], pops: ['balance', 'lose', 'elderly', 'hypertension', 'diabetes'], nutrition: { kcal: 150, protein: 3, fat: 8, carb: 16 }, ingredients: ['茭白 300g', '生抽 8ml', '代糖 2g', '香油几滴'], steps: ['茭白剥壳去老根，切滚刀块', '少油中火煸炒茭白 3 分钟至边缘微焦（煸炒到位才出香）', '加生抽、代糖、50ml 热水，盖盖小火焖 4 分钟', '开盖大火收汁，滴香油出锅；传统本帮重糖，这里换代糖'], highlight: '浓油赤酱的本帮味，糖减了 80% 依然鲜甜' },

  // ---------- 豫菜（河南） ----------
  { id: 'd1311', name: '河南蒸菜（蒸茼蒿）', region: '豫菜', flavors: ['清淡'], pops: ['lose', 'balance', 'elderly', 'diabetes', 'hypertension', 'hyperlipid'], nutrition: { kcal: 120, protein: 5, fat: 6, carb: 12 }, ingredients: ['茼蒿 250g', '面粉 20g', '玉米面 10g', '蒜泥 10g', '生抽 5ml', '醋 5ml'], steps: ['茼蒿洗净彻底晾干表面水分（带水会粘成一坨）', '面粉+玉米面混匀，抓拌到每片叶子均匀裹上薄粉', '水开后上笼大火蒸 5 分钟，开盖立刻抖散', '蒜泥+生抽+醋+几滴香油调成蘸汁，蘸着吃或直接淋', '河南「无菜不蒸」的吃法，控盐控油天花板'], highlight: '中原古法蒸菜，蔬菜裹粉蒸比炒保留更多营养' },

  // ---------- 山西面食 ----------
  { id: 'd1312', name: '莜面栲栳栳（杂粮主食）', region: '山西面食', flavors: ['咸鲜', '清淡'], pops: ['balance', 'diabetes', 'elderly', 'lose'], nutrition: { kcal: 320, protein: 12, fat: 6, carb: 58 }, ingredients: ['莜面 90g', '开水 95ml', '番茄 1 个', '鸡蛋 1 个', '蒜末少许'], steps: ['莜面用 95°C 以上开水烫面（烫透才有嚼劲），揉成光滑面团', '揪小剂在石板或刀背上推成薄片，卷成筒状立入蒸笼', '水开蒸 10 分钟（必须蒸透，否则发黏）', '番茄鸡蛋炒成臊子浇上；莜面 GI 值远低于白面', '一次可多做冻起来，早餐蒸 5 分钟即食'], highlight: '三晋杂粮之王，控糖人群的主食优选' },

  // ---------- 孕产/老人/儿童专供 ----------
  { id: 'd1201', name: '虾仁豆腐蒸蛋', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['child', 'pregnant', 'elderly', 'balance', 'toddler', 'hypertension', 'hyperlipid', 'lactation'], nutrition: { kcal: 210, protein: 20, fat: 10, carb: 7 }, ingredients: ['鸡蛋 2 个', '嫩豆腐 80g', '虾仁 50g', '温水 150ml', '生抽 3ml'], steps: ['鸡蛋加 1.5 倍温水和少许盐，过筛入碗（过筛才无孔洞）', '嫩豆腐切丁垫底，盖保鲜膜扎几个孔', '水开后中火蒸 8 分钟至表面凝固', '铺虾仁再蒸 3 分钟，淋几滴生抽香油'], highlight: '三重优质蛋白，牙口不好也零负担' },
  { id: 'd1202', name: '山药胡萝卜排骨汤', region: '家常菜', flavors: ['清淡', '甜'], pops: ['elderly', 'child', 'pregnant', 'balance', 'toddler', 'diabetes'], nutrition: { kcal: 320, protein: 24, fat: 14, carb: 22 }, ingredients: ['排骨 200g', '铁棍山药 150g', '胡萝卜 80g', '姜 3 片'], steps: ['排骨冷水下锅焯血沫，捞出热水冲净', '排骨+姜片加热水小火炖 40 分钟', '下山药(戴手套削皮防痒)和胡萝卜块再炖 20 分钟', '加盐撒葱花；山药软糯即化，老人不必费力咀嚼'], highlight: '健脾养胃，高钙汤底助力骨骼' },
  { id: 'd1203', name: '彩椒牛肉粒（补铁餐）', region: '家常菜', flavors: ['咸鲜'], pops: ['pregnant', 'child', 'muscle', 'toddler', 'hyperlipid'], nutrition: { kcal: 310, protein: 28, fat: 14, carb: 14 }, ingredients: ['牛里脊 150g', '红黄彩椒各半个', '黑胡椒 1g', '蒜末 5g'], steps: ['牛肉切 1.5cm 粒，加生抽淀粉黑胡椒腌 15 分钟', '不粘锅大火少油，牛肉粒煎 1 分钟锁汁盛出', '彩椒块大火炒 1 分钟保持脆感', '牛肉回锅翻匀即出锅（久炒会老），孕期补铁搭配维C彩椒吸收翻倍'], highlight: '补铁黄金搭档：血红素铁+维C 同盘' },
  { id: 'd1204', name: '上汤娃娃菜', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['elderly', 'child', 'pregnant', 'balance', 'lose', 'toddler'], nutrition: { kcal: 130, protein: 8, fat: 7, carb: 8 }, ingredients: ['娃娃菜 200g', '皮蛋半个(可选)', '蒜瓣 4 个', '高汤 150ml'], steps: ['娃娃菜顺长切 6 瓣；蒜瓣切厚片', '少油把蒜片煎至金黄，加高汤煮开', '下娃娃菜中火煮 4 分钟至梗软透', '连汤装碗，菜叶吸饱汤汁，不用怎么嚼也鲜美'], highlight: '软嫩无渣，老人孩子的友好蔬菜' },
  { id: 'd1205', name: '杂蔬鸡肉藜麦饭', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['lose', 'sugar', 'pregnant', 'muscle', 'balance', 'diabetes', 'hypertension', 'hyperlipid', 'toddler'], nutrition: { kcal: 420, protein: 28, fat: 11, carb: 52 }, ingredients: ['藜麦 50g', '大米 40g', '鸡腿肉 100g', '胡萝卜玉米粒青豆共 80g'], steps: ['藜麦洗净与大米同煮（水量比平时多一点）', '鸡腿肉切丁，生抽淀粉腌 10 分钟', '少油炒鸡丁至变白，下杂蔬炒 2 分钟', '倒进煮好的藜麦饭翻拌，焖 2 分钟融合'], highlight: '一锅端全谷物主食，叶酸和蛋白双在线' },
  { id: 'd1206', name: '银耳莲子羹', region: '家常菜', flavors: ['清淡', '甜'], pops: ['elderly', 'pregnant', 'balance', 'sugar', 'diabetes', 'toddler'], nutrition: { kcal: 140, protein: 3, fat: 1, carb: 32 }, ingredients: ['银耳半朵', '莲子 15g', '红枣 3 颗', '枸杞 3g', '冰糖少许'], steps: ['银耳冷水泡发 1 小时撕小朵（撕得越小出胶越快），莲子泡软去芯', '银耳莲子红枣加水大火烧开', '转小火炖 40 分钟至汤汁浓稠挂勺', '关火前 5 分钟下枸杞冰糖；控糖人群用代糖或不加'], highlight: '胶原蛋白感满满的滋补甜品，睡前一小碗' },

  // ---------- 午晚餐 · 家常 ----------
  { id: 'd1001', name: '西兰花炒鸡胸', region: '家常菜', flavors: ['清淡', '咸鲜'], pops: ['lose', 'muscle', 'balance', 'child', 'diabetes', 'hypertension', 'hyperlipid', 'toddler'], nutrition: { kcal: 280, protein: 34, fat: 9, carb: 12 }, ingredients: ['鸡胸 160g', '西兰花 150g', '蒜末 8g', '蛋清半个'], steps: ['鸡胸切片加蛋清淀粉抓匀（这是嫩的关键），腌 15 分钟', '西兰花切小朵盐水泡 5 分钟，焯水 90 秒过凉', '不粘锅少油滑炒鸡片至变白盛出', '爆香蒜末下西兰花，回锅鸡片，盐+黑胡椒翻匀 30 秒出锅'], highlight: '健身餐黄金组合，嫩到不柴的秘诀在上浆' },
  { id: 'd1002', name: '番茄炒蛋（控糖版）', region: '家常菜', flavors: ['甜', '咸鲜'], pops: ['balance', 'sugar', 'lose', 'child', 'toddler', 'hypertension', 'diabetes'], nutrition: { kcal: 220, protein: 12, fat: 14, carb: 10 }, ingredients: ['番茄 2 个', '鸡蛋 2 个', '代糖 2g', '葱花'], steps: ['鸡蛋加几滴料酒打散；番茄切块', '热锅热油快速炒蛋至刚凝固就盛出（老了会出水）', '番茄下锅中火炒 2 分钟出汁，加代糖', '蛋回锅翻匀 10 秒即出锅，撒葱花'], highlight: '国民下饭菜的健康版，全家家常第一名' },
  { id: 'd1003', name: '杂粮饭配清炒时蔬', region: '家常菜', flavors: ['清淡'], pops: ['balance', 'lose', 'sugar', 'elderly', 'diabetes', 'hypertension', 'hyperlipid', 'toddler'], nutrition: { kcal: 310, protein: 8, fat: 5, carb: 58 }, ingredients: ['三色糙米 70g', '当季绿叶菜 200g', '蒜末 5g'], steps: ['糙米提前泡 2 小时（或冷藏过夜），按 1:1.4 加水煮饭', '青菜洗净沥干，梗叶分开', '热锅少油爆香蒜末，先下菜梗大火炒 30 秒', '下菜叶加盐，大火 20 秒断生即出锅——久炒发黄失脆'], highlight: '低 GI 主食打底，餐餐必备的绿叶菜' },
  { id: 'd1004', name: '香煎三文鱼配芦笋', region: '家常菜', flavors: ['咸鲜'], pops: ['balance', 'muscle', 'lose', 'pregnant', 'hypertension', 'hyperlipid', 'diabetes', 'lactation'], nutrition: { kcal: 380, protein: 32, fat: 22, carb: 8 }, ingredients: ['三文鱼 150g', '芦笋 100g', '柠檬 2 片', '黑胡椒'], steps: ['鱼用厨房纸吸干（不吸干煎不出脆壳），撒盐黑胡椒腌 5 分钟', '不粘锅烧热，鱼皮朝下中火煎 3 分钟不要动它', '翻面再煎 2 分钟，同时用余油煎芦笋', '挤柠檬汁出锅；孕期选可生食级充分煎熟'], highlight: '优质 Omega-3，护心又养胎' },
  { id: 'd1005', name: '凉拌鸡丝荞麦面', region: '家常菜', flavors: ['酸', '辣', '清淡'], pops: ['lose', 'muscle', 'sugar', 'diabetes', 'hyperlipid'], nutrition: { kcal: 340, protein: 26, fat: 8, carb: 42 }, ingredients: ['荞麦面 80g', '鸡胸 100g', '黄瓜丝 50g', '油辣子 3g', '醋 8ml', '生抽 5ml'], steps: ['鸡胸冷水下锅加姜片料酒，煮 12 分钟焖 5 分钟，撕成粗丝', '荞麦面煮 4 分钟过冰水，更弹更筋道', '蒜水+醋+生抽+油辣子+少许糖调成料汁', '面垫底铺鸡丝黄瓜丝，浇汁拌匀，撒白芝麻'], highlight: '低 GI 主食+双蛋白，夏天来一碗最爽' },
  { id: 'd1006', name: '香菇滑鸡煲仔饭（少油）', region: '家常菜', flavors: ['酱香', '咸鲜'], pops: ['balance', 'muscle', 'child'], nutrition: { kcal: 520, protein: 24, fat: 12, carb: 78 }, ingredients: ['鸡腿肉 120g', '香菇 5 朵', '丝苗米 80g', '青菜 2 棵', '豉油 8ml'], steps: ['米入砂锅加水(1:1.2)大火烧开转小火', '焖 10 分钟至表面现蜂窝孔，铺腌好的鸡块香菇', '沿锅边淋几滴油（锅巴的来源），盖盖再焖 10 分钟', '关火焖 5 分钟，放青菜淋豉油拌匀即可'], highlight: '锅巴香气的控油版，一锅端出全家主食' },

  // ---------- 加餐 ----------
  { id: 'd1101', name: '希腊酸奶莓果杯', region: '家常菜', flavors: ['酸', '甜'], pops: ['lose', 'muscle', 'sugar', 'child', 'pregnant', 'toddler'], nutrition: { kcal: 160, protein: 15, fat: 4, carb: 16 }, ingredients: ['希腊酸奶 150g', '蓝莓 50g', '坚果碎 5g'], steps: ['杯底铺一层酸奶', '一层蓝莓一层酸奶叠加，卖相更好', '顶上撒坚果碎，冷藏 10 分钟口感更佳'], highlight: '加餐蛋白质补给，孕晚期加餐也合适' },
  { id: 'd1102', name: '水煮蛋 + 圣女果', region: '家常菜', flavors: ['清淡'], pops: ['lose', 'balance', 'muscle', 'child', 'elderly', 'toddler', 'hypertension', 'hyperlipid'], nutrition: { kcal: 120, protein: 9, fat: 7, carb: 5 }, ingredients: ['鸡蛋 1 个', '圣女果 8 颗'], steps: ['鸡蛋冷水下锅，水开后煮 8 分钟（溏心 6 分钟）', '过凉水好剥壳', '配圣女果装盒带走即食'], highlight: '零门槛快手加餐，办公室宿舍都能备' }
]

/** AI 批量扩充的菜品（scripts/gen-dishes.mjs 生成，已含超详细步骤，每个菜系补足 25 道） */
const GENERATED: Dish[] = (generatedJson as unknown as Dish[]).filter(
  (d) => d && d.name && Array.isArray(d.steps) && d.steps.length >= 3
)

const RAW_DISHES: Dish[] = [...RAW_HANDWRITTEN, ...GENERATED]

export const DISHES: Dish[] = RAW_DISHES.map((d) => {
  // AI 生成的超详细教程（dishes-detail.json）存在时覆盖默认步骤
  const detail = (detailSteps as Record<string, string[] | undefined>)[d.id]
  return Array.isArray(detail) && detail.length >= 3 ? { ...d, steps: detail } : d
})

export const BREAKFAST_IDS = ['d001', 'd002', 'd003', 'd004', 'd005', 'd006', 'd007', 'd008']
export const SNACK_IDS = ['d1101', 'd1102']

/** 按人群与餐次筛选候选菜 */
export function filterDishes(pop: string, meal: 'breakfast' | 'lunch' | 'dinner'): Dish[] {
  const isBreakfast = meal === 'breakfast'
  return DISHES.filter((d) => {
    if (isBreakfast) return BREAKFAST_IDS.includes(d.id)
    return !BREAKFAST_IDS.includes(d.id) && !SNACK_IDS.includes(d.id)
  }).filter((d) => d.pops.includes(pop as PopulationId) || pop === 'balance')
}
