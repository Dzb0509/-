<script setup lang="ts">
/**
 * AI 营养师对话页：Agent 多轮对话 + 工具调用过程可视化
 */
interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  tools?: string[]
  streaming?: boolean
}

const messages = ref<ChatMsg[]>([])
const input = ref('')
const busy = ref(false)
const listEl = ref<HTMLElement>()
const diet = useDietStore()

// 首条欢迎语（含今日摄入摘要，展示 Agent 的上下文感知能力）
onMounted(() => {
  const t = diet.todayTotals
  const g = diet.dailyGoals
  const summary =
    t.kcal > 0
      ? `我看了你的记录：今天已摄入约 ${Math.round(t.kcal)} kcal（目标 ${g.kcal} kcal），蛋白质 ${t.protein.toFixed(1)}/${g.protein}g。`
      : '今天还没有饮食记录，可以先去「今日餐盘」拍一张餐盘照片。'
  messages.value.push({
    role: 'assistant',
    text: `你好，我是你的 AI 营养师 🥗 ${summary}\n可以问我：今天吃得怎么样？帮我排个食谱？蛋白质吃够了吗？`
  })
})

const suggestions = ['帮我评估一下今天的饮食', '帮我排一份减脂食谱', '增肌该怎么吃？']

function scrollBottom() {
  nextTick(() => listEl.value?.scrollTo({ top: listEl.value.scrollHeight, smooth: true }))
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content || busy.value) return
  input.value = ''
  busy.value = true
  messages.value.push({ role: 'user', text: content })

  const reply: ChatMsg = { role: 'assistant', text: '', tools: [], streaming: true }
  messages.value.push(reply)
  scrollBottom()

  try {
    await streamSSE(
      '/api/chat',
      {
        messages: messages.value.filter((m) => !m.streaming).map(({ role, text }) => ({ role, text })),
        context: { today: { totals: diet.todayTotals, goals: diet.dailyGoals } }
      },
      (e) => {
        if (e.type === 'tool') reply.tools?.push(e.label ?? '调用工具')
        else if (e.type === 'text') reply.text += e.text ?? ''
        scrollBottom()
      }
    )
  } catch {
    reply.text = '网络异常，请稍后重试。'
  } finally {
    reply.streaming = false
    busy.value = false
    scrollBottom()
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 flex flex-col h-screen">
    <header class="pb-4">
      <h1 class="text-xl font-bold">🧑‍⚕️ AI 营养师</h1>
      <p class="text-xs text-slate-400 mt-0.5">可解释 Agent：每个回答前你可以看到它查证了什么</p>
    </header>

    <!-- 消息列表 -->
    <div ref="listEl" class="flex-1 overflow-y-auto space-y-4 pb-4">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="flex"
        :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div class="max-w-[85%] sm:max-w-[75%] space-y-1.5">
          <!-- 工具调用过程 -->
          <div v-if="m.tools?.length" class="flex flex-wrap gap-1.5">
            <span v-for="(t, j) in m.tools" :key="j" class="chip bg-sky-50 text-sky-600">
              <span class="animate-pulse" v-if="m.streaming && j === m.tools.length - 1">◌</span>
              🔧 {{ t }}
            </span>
          </div>
          <div
            class="rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap"
            :class="m.role === 'user' ? 'bg-primary text-white rounded-br-md' : 'bg-white shadow-card rounded-bl-md'"
          >
            {{ m.text }}<span v-if="m.streaming && m.text" class="animate-pulse text-primary-500">▍</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷提问 -->
    <div class="flex gap-2 overflow-x-auto py-2">
      <button
        v-for="s in suggestions"
        :key="s"
        class="chip bg-white shadow-card text-slate-500 hover:text-primary-600 whitespace-nowrap shrink-0 !py-2"
        :disabled="busy"
        @click="send(s)"
      >
        {{ s }}
      </button>
    </div>

    <!-- 输入框 -->
    <form class="flex gap-2 pt-2" @submit.prevent="send()">
      <el-input
        v-model="input"
        placeholder="向 AI 营养师提问…"
        size="large"
        :disabled="busy"
        clearable
      />
      <button type="submit" class="btn-primary !px-6" :disabled="busy || !input.trim()">
        发送
      </button>
    </form>
    <p class="text-[10px] text-slate-300 text-center pt-2">AI 生成内容仅供参考，不构成医疗建议</p>
  </div>
</template>
