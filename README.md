# 食刻 AI

> 全国高校 AI Web 开发挑战赛参赛作品 · AI 健康与生活服务

食刻 AI 是一个面向个人和家庭的本地饮食管理工具。用户可以设置人物定位、饮食目标和健康注意事项，获得每日餐食推荐；也可以拍照识餐、人工确认、保存记录，并在周报中查看真实饮食数据的趋势和反馈。

当前验收版本采用本地 Node 服务，浏览器访问 `http://localhost:3000`。在线托管不作为本版本的运行前提。

## 核心功能

- **每日餐食推荐**：按人群、餐次、目标、口味、忌口和昨日记录生成推荐，支持“换一换”和可解释推荐理由。
- **家庭套餐**：按家庭成员的年龄、人群和口味生成一荤一素一汤一主食的整桌方案，并进行跨餐去重。
- **AI 自定义方案**：自由填写口味、需求和忌口，由 GLM 生成个性化方案。
- **拍照识餐**：GLM-4V 识别菜品、风味标签、份量和营养；结果可以修改、删除或手动添加。
- **饮食记录与周报**：确认后写入当前用户，自动学习口味；周报只统计真实记录，没有记录的日期保持断点。
- **多用户档案**：同一浏览器可以保存多个用户，每个用户的资料、记录和周报相互独立。
- **图片防错配**：本地精确菜品图优先；没有精确缓存时显示带菜名的核验卡，避免拿其他菜品图片顶替。

## 技术架构

```text
浏览器：Vue 3 + Nuxt 3 SPA + TypeScript + Pinia
界面：Tailwind CSS + Element Plus + ECharts
服务端：Nuxt Server Routes（同仓的 AI 接入层）
模型：智谱 GLM-4-Flash、GLM-4V-Flash、embedding-3（可选）
数据：localStorage 用户数据 + 构建产物内置菜库 + public/dish-imgs 本地图片缓存
```

### 目录结构

```text
pages/          登录、首页、识餐、记录、周报、家庭、我的
components/     导航、菜品卡片、上传卡片、图表和对话面板
stores/         Pinia 状态与本地持久化
server/api/     推荐、识餐、点评、对话、周报、菜品和图片接口
server/utils/   菜库、模型接入、RAG、图片供给和 SSE 工具
scripts/        构建、菜库生成、图片预热和质量检查脚本
tests/          SFC、服务端 TypeScript 和关键功能回归检查
public/         前端静态资源与可选本地菜品图片缓存
```

### 服务端 API

| 路由 | 说明 |
|---|---|
| `POST /api/recommend` | 混合推荐；`fast=true` 时使用本地规则快速换菜 |
| `POST /api/customize` | 根据口味、需求和忌口生成自定义方案 |
| `GET /api/dish-image` | 按菜名 MD5 读取本地精确图片，支持候选轮换 |
| `POST /api/vision` | GLM-4V 拍照识餐，输出严格 JSON |
| `POST /api/chat` | AI 营养师对话，SSE 流式输出 |
| `POST /api/comment` | RAG 检索后生成流式营养点评 |
| `POST /api/report` | 基于真实七天记录生成流式周报 |
| `POST /api/rag` | 膳食知识库检索演示 |
| `GET /api/dishes` | 输出 529 道菜品、营养、食材和步骤 |

## 安装与运行

### 环境要求

- Node.js 18.20+，推荐 Node.js 20 LTS
- npm 9+
- 智谱 API Key（只有使用 AI 识餐和模型生成时需要）

### 开发模式

```bash
npm install
copy .env.example .env        # Windows PowerShell
# cp .env.example .env        # macOS / Linux
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 本地生产预览

```bash
npm install
copy .env.example .env
npm run build:local
npm run start:local
```

`start-prod.mjs` 会读取项目根目录的 `.env`，再启动 `.output/server/index.mjs`。API Key 只进入服务端进程，不会被打包进前端。

### 回归测试

```bash
npm test
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写。`.env` 已被 `.gitignore` 忽略，禁止提交真实密钥。

| 变量 | 用途 | 默认值 |
|---|---|---|
| `ZHIPU_API_KEY` | 智谱文本和视觉链路的通用 Key | 空 |
| `LLM_API_KEY` | 文本模型专用 Key | 空 |
| `LLM_BASE_URL` | 文本模型 OpenAI 兼容地址 | 智谱 v4 |
| `VISION_API_KEY` | 视觉模型专用 Key | 空 |
| `VISION_BASE_URL` | 视觉模型 OpenAI 兼容地址 | 智谱 v4 |
| `NUXT_CHAT_MODEL` | 文本模型 | `glm-4-flash` |
| `NUXT_VISION_MODEL` | 识餐模型 | `glm-4v-flash` |
| `NUXT_EMBEDDING_MODEL` | RAG 向量模型 | `embedding-3` |
| `NUXT_APP_BASE_URL` | 前端部署子路径 | `/` |
| `NUXT_PUBLIC_API_BASE` | 跨域后端 API 前缀 | 空 |

没有配置文本 Key 时，推荐、点评、对话和周报会使用本地规则或 mock 降级。没有视觉 Key 时，识餐会提示服务未配置，不会把示例结果写进记录。

## 代码规范与协作约定

- 页面放在 `pages/`，可复用 UI 放在 `components/`，业务状态集中在 `stores/`，服务端接口放在 `server/api/`。
- 使用 TypeScript 类型、Vue `<script setup>` 和组合式 API；函数名使用动词开头，组件名使用 PascalCase。
- API 路由必须校验输入、明确错误状态，并提供可解释的降级路径；密钥只能从服务端环境变量读取。
- 修改功能时同步更新注释、`.env.example`、README 和回归检查；提交前运行 `npm test`。
- 提交信息使用简短的英文动词前缀，例如 `feat:`、`fix:`、`docs:`、`refactor:`。

## Git 记录与仓库

项目保留完整的 Git 提交历史，记录覆盖产品重构、登录与首次设置、家庭模式、AI 接口、图片缓存、构建交付和稳定性修复等阶段。查看历史：

```bash
git log --oneline --decorate --graph --all
```

代码仓库：[GitHub](https://github.com/Dzb0509/-)

提交或评审时请确认仓库设置为 **Public**，或为评审人员提供访问权限。

## 团队信息

| 项目 | 信息 |
|---|---|
| 学校 | 宁波财经学院 |
| 队名 | 智流工坊 |
| 成员 | 杜志博 |
| 指导老师 | 刘欣欣 |
| 分工 | 一人完成产品设计、前端开发、后端与 AI 集成、数据构建、测试和部署 |

## 数据与隐私说明

用户资料、账号摘要、家庭成员和饮食记录保存在当前浏览器的 `localStorage`，当前版本没有云数据库和跨设备同步。清理浏览器站点数据会删除本地记录，请在演示前准备专用账号。营养建议仅供参考，不构成医疗诊断。
