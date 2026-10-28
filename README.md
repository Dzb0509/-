# 食刻 AI · 你的 AI 营养分析师

> 全国高校 AI Web 开发挑战赛参赛作品 · 推荐方向 6「AI 健康与生活服务」

拍一张餐盘照片，AI 营养师告诉你吃了什么、营养如何、下一餐怎么吃。

## ✨ 核心功能

- **📷 拍照识餐（多模态）**：上传/拖拽餐盘照片，视觉大模型识别菜品、估算份量，输出结构化结果，用户可修正
- **🧑‍⚕️ AI 流式点评（LLM + 生成式 UI）**：营养师点评逐字流式输出，并动态生成营养图表卡片
- **🔧 可解释 Agent**：对话式营养师，工具调用过程全程可视化（查记录/查营养库/排食谱）
- **📚 RAG 营养知识库**：点评前先检索《中国食物成分表》《膳食指南》，杜绝营养数据幻觉
- **📊 记录与周报**：本地持久化饮食记录、热量趋势图、AI 周报总结
- **🛡️ 负责任 AI**：非诊断红线、常驻免责声明、低置信度识别提醒用户确认

## 🛠 技术架构

```
Vue 3 + Nuxt 3 (SPA) + TypeScript + Tailwind CSS + Pinia + Element Plus + ECharts
服务端（Nuxt Server Routes，作为 AI 接入层）：
  /api/vision  → GLM-4V 视觉识餐（JSON Schema 约束输出）
  /api/comment → RAG 检索 + GLM-4 流式营养点评（SSE）
  /api/chat    → GLM-4 Function Calling 营养师 Agent（SSE）
  /api/report  → AI 周报生成（SSE）
```

- API Key 仅存在于服务端环境变量，绝不打包进前端
- 图片上传前经 Canvas 压缩，控制 token 用量
- 数据持久化：localStorage（规划升级 IndexedDB）

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制 .env.example 为 .env，填入智谱 API Key）
cp .env.example .env

# 3. 启动开发服务
npm run dev
# 访问 http://localhost:3000
```

> 未配置 API Key 时，服务端走 mock 数据，可完整体验全部交互流程。

## 👥 团队信息

（待补充：成员姓名、学校、分工、指导老师）

## 📄 License

仅供竞赛评审使用。
