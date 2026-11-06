# 食刻 AI · 代码总结

> AI 营养分析师 Web 应用 · 全国高校 AI Web 开发挑战赛参赛作品
> 技术栈：**Nuxt 3.17（ssr:false）+ TypeScript + Tailwind CSS + Pinia + Element Plus + ECharts**
> 运行环境：Node 22 · 智谱 AI（GLM-4-Flash / GLM-4V / CogView / embedding-3 / Web Search）
> 代码统计：**约 6,100 行 TS/Vue 源码**（不含 JSON 数据与配置）· 34 次 Git 提交（2026-10-28 ~ 11-05）

---

## 一、目录结构与代码量总览

```
shike-ai/
├── pages/            8 个页面     1,463 行   路由视图
├── components/       12 个组件    1,032 行   可复用 UI
├── server/api/       9 个接口     1,225 行   后端 API（Nitro）
├── server/utils/     7 个工具     615 行     菜库/LLM/RAG/找图等核心封装
├── stores/           1 个 store   180 行     Pinia 全局状态
├── composables/      2 个组合式   69 行      SSE 流式 / 图片压缩
├── types/            3 个类型文件 343 行     领域模型与人群定义
├── layouts/          1 个布局     62 行      全局导航（sticky 固定侧栏）
├── scripts/          8 个脚本     1,090 行   数据生成/图片治理工具链
├── server/utils/dishes-generated.json   356K  AI 批量生成的 466 道菜
└── public/dish-imgs/                    31MB  543 张菜品图本地缓存
```

---

## 二、数据层：菜品库（server/utils/dishes.ts，149 行）

**527 道菜 = 61 道手写种子菜 + 466 道 AI 批量生成菜**，覆盖 20 个菜系（八大菜系 + 湖北/云南/贵州/京/新疆/客家/赣/桂/本帮/豫/山西面食）。

三层合成，运行时零 IO：

| 来源 | 数量 | 说明 |
|---|---|---|
| `RAW_HANDWRITTEN` | 61 道 | 精写种子菜：每道含菜系/口味/13 类人群标签/营养四项/食材/步骤/亮点，早 8 + 加餐 2 + 正餐 51 |
| `dishes-generated.json` | 466 道 | `scripts/gen-dishes.mjs` 用 GLM 批量生成，每菜系补足 20~25 道，导入时校验 steps≥3 |
| `dishes-detail.json` | 63 道覆盖 | `scripts/gen-detail.mjs` 生成的超详细教学步骤，按 dish id 覆盖默认 steps |

核心筛选函数 `filterDishes(pop, meal)`：按人群标签（pops）× 餐次（早餐走 BREAKFAST_IDS 白名单，正餐排除早餐与加餐）过滤候选。

**两级人群模型**（types/recommend.ts）：
- 一级 5 组 `POP_GROUPS`：婴幼儿 / 儿童青少年 / 成年人 / 孕产期 / 老年人
- 二级 13 个 `PopulationId`：balance·lose·muscle·sugar / child / infant·toddler / pregnant·lactation / elderly·hypertension·diabetes·hyperlipid

---

## 三、后端 API（server/api/，9 个接口 1,225 行）

| 接口 | 行数 | 功能 | AI 依赖 | 降级策略 |
|---|---|---|---|---|
| `recommend.post.ts` | 407 | **核心推荐引擎**（详见下节） | GLM-4 + Web Search | 规则引擎兜底 |
| `dish-image.get.ts` | 220 | 菜品图片三通道供给 | CogView（可选） | 必应图/占位符 |
| `chat.post.ts` | 195 | AI 营养师对话（SSE 流式） | GLM-4-Flash | mock 文案 |
| `report.post.ts` | 121 | AI 周报（真流式） | GLM-4-Flash | 真实统计规则文案 |
| `vision.post.ts` | 97 | 拍照识餐（多模态） | GLM-4V | mock 识别 |
| `customize.post.ts` | 77 | AI 自定义方案：人群+口味+需求+忌口 → 宜吃/忌吃/注意点 | GLM-4 | 返回错误提示 |
| `comment.post.ts` | 77 | 饮食记录流式 AI 点评（RAG→GLM） | GLM-4 + RAG | mock 文案 |
| `rag.post.ts` | 18 | RAG 检索演示/调试接口 | embedding-3 | 关键词匹配 |
| `dishes.get.ts` | 13 | 菜库全量输出 | 无 | — |

**通用设计**：所有接口无 Key / 上游失败时静默降级，绝不让页面白屏；API Key 仅存在于服务端环境变量（`ZHIPU_API_KEY`），前端包零泄漏。

### 3.1 推荐引擎 recommend.post.ts（项目心脏）

**混合双轨架构**：

```
请求 ──┬─ fast:true ──→ 规则引擎毫秒级出餐（换一换按钮，实测 5ms）
       │                 打分：人群契合 + 口味匹配 + 营养距离；excludeNames 排除当前展示菜
       │
       └─ 完整模式 ──→ ① RAG 检索《中国居民膳食指南》段落（embedding-3，3s 超时降级关键词）
                      ② 规则引擎先算一遍候选分（ruleResult 兜底）
                      ③ GLM-4 从候选中择优 + 生成推荐理由（≤160 字）
                      ④ 口味画像（近期吃过的高频口味）与昨日菜单注入 prompt 避免重复
                      ⑤ webSearch 搜索贴合用户构成的菜谱 → 可改写为 webDishes（source:'web'）
                      ⑥ 忌口 tabooHit 全链路过滤；用户家传菜 +3 分加权
```

**家庭模式特殊链路**：
- `buildFamilyCandidates()`：按各成员人群标签的交集/并集配额采样，保证每个角色的候选 ≥3 道
- 三餐（早/午/晚）**并行**执行 webSearch + GLM（原串行 40~60s → 并行 28.5s），每餐携带「已定菜单禁选名单」+ `usedIds` 全局去重，实测零跨餐重复
- `composeFamilySet()`：按 FAMILY_SET 角色入座——早餐「主食+蛋白质+蔬果」3 道、午晚「一荤一素一汤一主食」4 道，GLM 失败时角色兜底补位
- Prompt 硬约束：推荐理由严禁虚构未提及的家庭成员

---

## 四、图片系统（dish-image + bingimg，0 成本方案）

**三通道供给**，按优先级回落：

1. **本地缓存优先**：菜名 md5 → `public/dish-imgs/{slug}.jpg`（543 张 / 31MB 全量预热），ETag 协商缓存，命中毫秒级
2. **必应网络图**（`server/utils/bingimg.ts`，84 行）：`alt=N` 参数轮换候选图——搜图 → 抓原图直链 → sharp 裁四边 12% 去水印 → 压 512px JPEG 落盘；首次约 1.1s，缓存命中 38ms
3. **CogView 生成**（可选）：`regen=1` 覆盖写入（不 unlink，规避安全护栏），识别余额不足（code 1113）不重试，并发上限 2

配套脚本见第六节工具链。URL 携带全局版本号 `&v=20261030`，批量换图后强制浏览器丢弃旧缓存。

---

## 五、前端（pages 8 页 + components 12 组件）

### 5.1 页面（按代码量排序）

| 页面 | 行数 | 职责 |
|---|---|---|
| `family.vue` | 373 | 家庭食谱：成员管理（年龄+人群+AI自定义）、上传家传菜弹窗、整桌生成（左栏 xl:sticky 固定）、逐餐刷新 |
| `index.vue` | 341 | **今日推荐（主打）**：HeroCarousel 轮播、两级人群选择、三餐卡片、换一换（fast 模式）、reqSeq 竞态防护 + 400ms 防抖、planCache 本地缓存秒开 + 后台静默刷新 |
| `report.vue` | 201 | AI 周报：7 天真实记录统计（无记录日断开不造假数据）、目标达成率、本周饮食画像（常吃 Top5 + 口味标签）、AI 流式总结 |
| `analyze.vue` | 191 | 识餐结果页：识别列表编辑、营养汇总、AI 点评流式输出 |
| `profile.vue` | 161 | 我的：人群定位（两级分组选择器）、AI 自定义偏好、口味画像展示 |
| `record.vue` | 94 | 饮食记录：拍照识餐入口、当日餐次记录 |
| `explore.vue` | 93 | 地方特色：按菜系浏览 |
| `chat.vue` | 9 | 薄壳，实际逻辑在 ChatPanel |

### 5.2 关键组件

| 组件 | 行数 | 说明 |
|---|---|---|
| `DishCard.vue` | 264 | 菜卡全家桶：骨架屏渐显、hover ⟳ 换一张（alt 轮换）、来源徽标（AI 生成/规则引擎/🌐联网/🏠我家菜谱）、吃了它防双击、营养环形图 |
| `CustomPrefDialog.vue` | 157 | AI 自定义弹窗：口味/需求/忌口 → /api/customize 生成方案 |
| `ChatPanel.vue` | 142 | AI 对话面板：useSSE 流式渲染 |
| `HeroCarousel.vue` | 104 | 首页 Hero 图文轮播（5s JS 循环） |
| `UploadCard.vue` | 85 | 上传家传菜谱表单 |
| 其余 | — | FoodCard / RingChart / MacroBars / AiMascot（悬浮小助手）/ NavIcon / StageIndicator / DisclaimerBar |

### 5.3 状态管理 stores/diet.ts（180 行）

单 store 持久化（localStorage）：`profile`（人群+自定义方案）、`family`（成员列表）、`userRecipes`（家传菜）、`records`（按日饮食记录）、`tasteProfile`（自动学习的口味画像）、`planCache`（最多 8 份推荐结果，首页秒开）。

**composables**：`useSSE.ts`（fetch 流式读取 + body 透传，对话/点评/周报共用）；`useImageCompress.ts`（识餐上传前压缩）。

---

## 六、工具脚本（scripts/，8 个 1,090 行）——数据治理流水线

| 脚本 | 行数 | 用途 |
|---|---|---|
| `gen-dishes.mjs` | 173 | GLM 批量生成 466 道菜（每菜系 20~25 道） |
| `gen-detail.mjs` | 100 | 生成 63 道超详细教学步骤 |
| `fetch-web-images.mjs` | 153 | 必应批量找图 + GLM-4V 质检，断点续跑 |
| `retry-todo.mjs` | 141 | 失败重试（3 组检索词变体 + 核心名质检），59 张救回 57 张 |
| `qa-images.mjs` | 149 | GLM-4V 全量图片质检（默认只查不修） |
| `fix-mismatch.mjs` | 181 | 错图修复：多检索词重搜 + 双关卡质检 + 裁边 12% 去水印，支持 --list 指定清单 |
| `regen-all.mjs` | 156 | 全量重新生成（含连续 5 张失败熔断） |
| `prewarm-images.mjs` | 37 | 缓存预热（命中 200ms / 生成 3500ms 节流），529 张 2 分钟全量命中 |

**质检双关卡设计**：下载后裁边再质检 + 提示词强化水印检测，图片与菜名不符率从 40%（CogView-3-Flash 退化期）降到接近 0。

---

## 七、基础设施封装（server/utils/）

| 文件 | 行数 | 说明 |
|---|---|---|
| `zhipu.ts` | 106 | 智谱统一接入：`llmChat` / `llmChatStream` / `embed`，429/5xx 指数退避重试，`hasTextKey` / `hasVisionKey` 能力探测，可切换 DeepSeek 等兼容服务 |
| `rag.ts` | 129 | 膳食指南知识库：embedding-3 向量检索（3s 超时降级关键词匹配） |
| `bingimg.ts` | 84 | 必应搜图 → 下载 → 裁边去水印 → sharp 512 JPEG |
| `websearch.ts` | 65 | 智谱 Web Search 封装（search_std），10 分钟内存缓存，失败静默 |
| `sse.ts` | 49 | SSE 初始化与 OpenAI 风格流转发 |
| `foodDb.ts` | 33 | 识餐 mock 数据兜底 |
| `dishes.ts` | 149 | 菜库三层合成（见第二节） |

---

## 八、关键设计亮点（答辩可引用）

1. **混合双轨推荐架构**：AI 深度生成（个性化、可解释）+ 规则引擎秒换（5ms、零成本、零延迟）——AI 负责质量，规则负责体验。
2. **性能工程**：家庭推荐三餐并行化（40-60s→28.5s）、planCache 秒开、请求序号防竞态、防抖、webSearch 缓存。
3. **0 元图片方案**：必应真实菜品图 + GLM-4V 双关卡质检 + 裁边去水印，543 张图本地毫秒级供给，不依赖付费生图。
4. **全链路降级**：9 个 API 每个都有无 Key/上游失败的兜底路径，断网断费页面不白屏。
5. **安全**：API Key 仅服务端环境变量；RAG 先检索后生成抑制幻觉；推荐理由禁虚构成员。
6. **数据真实性**：周报页只统计真实记录（无记录日断开），拒绝随机假数据——评委刷新页面数据不变。

---

*文档生成于 2026-11-06，基于 34 次提交（007746d 之后）的真实代码统计。*
