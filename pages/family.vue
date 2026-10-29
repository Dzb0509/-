<script setup lang="ts">
/**
 * 家庭食谱：录入家庭成员（年龄+人群）→ AI 综合生成满足所有人的最优三餐
 */
import type { RecommendResult, Dish, FamilyMember, PopulationId, CustomPref, DishRole } from '~/types/recommend'
import { POPULATIONS, POP_GROUPS, POP_MAP, FAMILY_SET, DISH_ROLE_LABELS, DISH_ROLE_EMOJIS, dishRole } from '~/types/recommend'
import { MEAL_LABELS } from '~/types/diet'

const diet = useDietStore()

const MEALS = [
  { key: 'breakfast' as const, emoji: '🌅' },
  { key: 'lunch' as const, emoji: '☀️' },
  { key: 'dinner' as const, emoji: '🌙' }
]

const plan = ref<RecommendResult | null>(null)
const loading = ref(false)
const refreshing = ref<('breakfast' | 'lunch' | 'dinner')[]>([])

// 新成员表单
const newLabel = ref('')
const newAge = ref(30)
const newPop = ref<PopulationId>('balance')

// AI 自定义弹窗：当前编辑的成员（null = 未打开）
const customMemberId = ref<string | null>(null)
const customEditing = computed(() => diet.family.find((m) => m.id === customMemberId.value) ?? null)
const dialogOpen = computed({
  get: () => customMemberId.value !== null,
  set: (v: boolean) => {
    if (!v) customMemberId.value = null
  }
})

// 我家菜谱上传弹窗（食材/步骤按行分割）
const recipeDialogOpen = ref(false)
const rName = ref('')
const rIngredients = ref('')
const rSteps = ref('')
const rNote = ref('')
function openRecipeDialog() {
  rName.value = ''
  rIngredients.value = ''
  rSteps.value = ''
  rNote.value = ''
  recipeDialogOpen.value = true
}
function saveRecipe() {
  const name = rName.value.trim()
  const ingredients = rIngredients.value.split('\n').map((s) => s.trim()).filter(Boolean)
  const steps = rSteps.value.split('\n').map((s) => s.trim()).filter(Boolean)
  if (!name) {
    ElMessage.warning('填一下菜名')
    return
  }
  if (!steps.length) {
    ElMessage.warning('至少写一步做法')
    return
  }
  diet.addUserRecipe({ name, ingredients, steps, note: rNote.value.trim() || undefined })
  recipeDialogOpen.value = false
  ElMessage.success('菜谱已保存，AI 生成全家食谱时会优先安排它')
  plan.value = null
}

function saveMemberCustom(pref: CustomPref) {
  if (customMemberId.value) diet.updateFamilyMember(customMemberId.value, { custom: pref })
  plan.value = null
}

function addMember() {
  if (!newLabel.value.trim()) {
    ElMessage.warning('给成员起个称呼，如「爸爸」「大宝」')
    return
  }
  if (diet.family.length >= 8) {
    ElMessage.warning('最多添加 8 位成员')
    return
  }
  diet.addFamilyMember({
    label: newLabel.value.trim().slice(0, 6),
    age: newAge.value,
    population: newPop.value
  })
  newLabel.value = ''
  plan.value = null // 成员变化后旧推荐作废
  ElMessage.success('成员已添加，点「生成全家食谱」')
}

function removeMember(id: string) {
  diet.removeFamilyMember(id)
  plan.value = null
}

async function fetchPlan(meals?: ('breakfast' | 'lunch' | 'dinner')[]) {
  if (!diet.family.length) {
    ElMessage.warning('先添加至少一位家庭成员')
    return
  }
  if (meals?.length) refreshing.value = [...meals]
  else loading.value = true
  try {
    const res = await $fetch<RecommendResult>('/api/recommend', {
      method: 'POST',
      body: {
        members: diet.family,
        day: 'today',
        meals: meals ?? ['breakfast', 'lunch', 'dinner'],
        yesterday: diet.yesterdayNames,
        taste: diet.tasteProfile,
        customRecipes: diet.userRecipes
      }
    })
    if (meals?.length && plan.value) {
      for (const m of meals) plan.value.meals[m] = res.meals[m]
      plan.value.source = res.source
    } else {
      plan.value = res
    }
  } catch {
    ElMessage.error('生成失败，请稍后重试')
  } finally {
    loading.value = false
    refreshing.value = []
  }
}

const familyPopSummary = computed(() =>
  [...new Set(diet.family.map((m) => POPULATIONS.find((p) => p.id === m.population)?.label ?? ''))].filter(Boolean).join(' / ')
)

const popLabel = (id: PopulationId) => POP_MAP[id]?.label ?? id
const popEmoji = (id: PopulationId) => POP_MAP[id]?.emoji ?? '👤'

/** 一餐按「一整份」角色分组（一荤一素一汤一主食），无法归类的放「其他」；早餐用专属标签 */
interface MealGroup { role: DishRole; label: string; emoji: string; dishes: Dish[] }
const BREAKFAST_ROLE_LABELS: Partial<Record<DishRole, string>> = { meat: '蛋白质', veg: '果蔬', soup: '汤粥' }
function mealGroups(meal: 'breakfast' | 'lunch' | 'dinner', dishes?: Dish[]): MealGroup[] {
  if (!dishes?.length) return []
  const groups: MealGroup[] = []
  for (const role of FAMILY_SET[meal]) {
    const ds = dishes.filter((d) => dishRole(d) === role)
    if (ds.length)
      groups.push({
        role,
        label: meal === 'breakfast' ? (BREAKFAST_ROLE_LABELS[role] ?? DISH_ROLE_LABELS[role]) : DISH_ROLE_LABELS[role],
        emoji: DISH_ROLE_EMOJIS[role],
        dishes: ds
      })
  }
  const rest = dishes.filter((d) => !groups.some((g) => g.dishes.includes(d)))
  if (rest.length) groups.push({ role: 'veg', label: '其他', emoji: '🍴', dishes: rest })
  return groups
}
const mealKcal = (dishes?: Dish[]) => (dishes ?? []).reduce((s, d) => s + d.nutrition.kcal, 0)
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight">👨‍👩‍👧‍👦 家庭食谱 · 一桌菜照顾全家</h1>
      <p class="text-sm text-slate-400 mt-1">
        录入每位家人的年龄与人群，AI 取「全家营养需求的交集」生成一整份食谱：早餐 3 道，午/晚餐一荤一素一汤一主食
      </p>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <!-- 左：成员管理 -->
      <section class="card space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">家庭成员（{{ diet.family.length }}）</h2>
          <span class="text-[11px] text-slate-400">保存于本机</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="m in diet.family"
            :key="m.id"
            class="rounded-lg bg-slate-50 px-3 py-2.5"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-xl">{{ popEmoji(m.population) }}</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium">{{ m.label }} <span class="text-xs text-slate-400 font-normal">{{ m.age }} 岁</span></p>
                <p class="text-[11px] text-slate-400">{{ popLabel(m.population) }}</p>
              </div>
              <el-select
                :model-value="m.population"
                size="small"
                class="!w-32"
                @update:model-value="(v: PopulationId) => { diet.updateFamilyMember(m.id, { population: v }); plan = null }"
              >
                <el-option-group v-for="g in POP_GROUPS" :key="g.id" :label="`${g.emoji} ${g.label}`">
                  <el-option
                    v-for="pid in g.options"
                    :key="pid"
                    :value="pid"
                    :label="`${POP_MAP[pid].emoji} ${POP_MAP[pid].label}`"
                  />
                </el-option-group>
              </el-select>
              <button class="text-slate-300 hover:text-red-400 transition-colors text-xs" @click="removeMember(m.id)">✕</button>
            </div>
            <!-- 成员 AI 自定义 -->
            <button
              class="mt-2 text-[11px] font-medium px-2 py-1 rounded transition-colors"
              :class="m.custom ? 'bg-primary-50 text-primary-700' : 'text-slate-400 hover:text-primary-600'"
              @click="customMemberId = m.id"
            >
              {{ m.custom ? `✨ 已自定义：${m.custom.summary?.slice(0, 16) || '方案生效中'}…` : '✨ AI 自定义口味/忌口' }}
            </button>
          </div>
        </div>

        <!-- 添加成员 -->
        <div class="rounded-lg border border-dashed border-slate-200 p-3 space-y-2.5">
          <div class="flex gap-2">
            <el-input v-model="newLabel" placeholder="称呼，如：爸爸" size="small" maxlength="6" class="!w-28" />
            <el-input-number v-model="newAge" :min="1" :max="100" size="small" class="!w-24" />
            <el-select v-model="newPop" size="small" class="flex-1">
              <el-option-group v-for="g in POP_GROUPS" :key="g.id" :label="`${g.emoji} ${g.label}`">
                <el-option
                  v-for="pid in g.options"
                  :key="pid"
                  :value="pid"
                  :label="`${POP_MAP[pid].emoji} ${POP_MAP[pid].label}`"
                />
              </el-option-group>
            </el-select>
          </div>
          <button class="btn-secondary !py-1.5 !text-xs w-full" @click="addMember">+ 添加成员</button>
        </div>

        <!-- 我家菜谱：上传后参与全家推荐 -->
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">📖 我家菜谱（{{ diet.userRecipes.length }}）</h3>
            <button class="text-xs text-primary-600 hover:text-primary-700 font-medium" @click="openRecipeDialog">+ 上传菜谱</button>
          </div>
          <div class="mt-2 space-y-1.5">
            <div
              v-for="r in diet.userRecipes"
              :key="r.id"
              class="flex items-center justify-between rounded bg-orange-50 px-2.5 py-1.5"
            >
              <span class="text-xs truncate">🏠 {{ r.name }} <span class="text-slate-400">· {{ r.steps.length }} 步做法</span></span>
              <button class="text-slate-300 hover:text-red-400 text-xs shrink-0" @click="diet.removeUserRecipe(r.id)">✕</button>
            </div>
            <p v-if="!diet.userRecipes.length" class="text-[11px] text-slate-400 leading-relaxed">
              上传奶奶的拿手菜、宝宝的辅食做法，AI 生成全家食谱时会优先安排它们
            </p>
          </div>
        </div>

        <button class="btn-primary w-full" :disabled="loading || !diet.family.length" @click="fetchPlan()">
          {{ loading ? 'AI 正在统筹全家口味…' : '🍜 生成全家最优食谱' }}
        </button>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          当前覆盖人群：{{ familyPopSummary || '暂无' }}。AI 会避开昨天吃过的菜，参考家庭口味画像，并结合联网搜索的家常菜谱灵感。
        </p>
      </section>

      <!-- 右：推荐结果 -->
      <div class="xl:col-span-2 space-y-5">
        <section v-if="plan?.reason" class="card !py-3 !px-4 flex items-start gap-2.5">
          <span class="text-lg leading-none mt-0.5">🧑‍⚕️</span>
          <p class="text-sm text-slate-600 leading-relaxed">{{ plan.reason }}</p>
          <span class="ml-auto chip shrink-0" :class="plan.source === 'glm' ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-400'">
            {{ plan.source === 'glm' ? 'AI 个性化统筹' : '规则引擎' }}
          </span>
        </section>

        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div v-for="i in 8" :key="i" class="card h-64 animate-pulse !bg-slate-50" />
        </div>

        <template v-else-if="plan">
          <section v-for="m in MEALS" :key="m.key" class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="font-semibold flex items-center gap-2">
                <span>{{ m.emoji }}</span> {{ MEAL_LABELS[m.key] }}
                <span v-if="mealKcal(plan.meals[m.key])" class="chip bg-slate-100 text-slate-500 !text-[11px] font-normal">约 {{ mealKcal(plan.meals[m.key]) }} kcal/人</span>
              </h2>
              <button
                class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                :disabled="refreshing.includes(m.key)"
                @click="fetchPlan([m.key])"
              >
                {{ refreshing.includes(m.key) ? '换中…' : '换一桌 ⟳' }}
              </button>
            </div>
            <!-- 一桌菜：按角色分组（一荤一素一汤一主食） -->
            <div class="card !p-4 space-y-4">
              <div v-for="g in mealGroups(m.key, plan.meals[m.key])" :key="g.label">
                <p class="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  {{ g.emoji }} {{ g.label }}
                  <span class="text-slate-300 font-normal">· {{ g.dishes.length }} 道</span>
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DishCard
                    v-for="dish in g.dishes"
                    :key="dish.id"
                    :dish="dish"
                    :meal="m.key"
                  />
                </div>
              </div>
            </div>
          </section>
        </template>

        <div v-else class="card text-center !py-14 space-y-2">
          <p class="text-4xl">🍽️</p>
          <p class="text-slate-500 text-sm">添加家庭成员后，点左侧「生成全家最优食谱」</p>
          <p class="text-xs text-slate-400">每餐生成一整桌：早餐 3 道，午/晚餐一荤一素一汤一主食，同时照顾孕妈、老人和孩子</p>
        </div>
      </div>
    </div>

    <!-- 成员 AI 自定义弹窗 -->
    <CustomPrefDialog
      v-if="customEditing"
      :key="customEditing.id"
      v-model:open="dialogOpen"
      :population="customEditing.population"
      :age="customEditing.age"
      :existing="customEditing.custom ?? null"
      @save="saveMemberCustom"
    />

    <!-- 上传我家菜谱弹窗 -->
    <el-dialog v-model="recipeDialogOpen" title="📖 上传我家菜谱" width="480px" append-to-body>
      <div class="space-y-3">
        <el-input v-model="rName" placeholder="菜名，如：奶奶的红烧蹄髈" maxlength="20" />
        <div>
          <p class="text-xs text-slate-500 mb-1">食材（一行一个）</p>
          <el-input v-model="rIngredients" type="textarea" :rows="3" placeholder="猪蹄 500g&#10;黄豆 50g" />
        </div>
        <div>
          <p class="text-xs text-slate-500 mb-1">做法步骤（一行一步，3-8 步更佳）</p>
          <el-input v-model="rSteps" type="textarea" :rows="5" placeholder="冷水下锅焯水去腥&#10;转小火炖 1.5 小时" />
        </div>
        <el-input v-model="rNote" placeholder="一句话介绍（可选）：软烂入味，老人孩子都爱" maxlength="40" />
        <p class="text-[11px] text-slate-400">保存后 AI 会按菜的角色（荤/素/汤/主食）把它安排进全家食谱，图片也会自动生成</p>
      </div>
      <template #footer>
        <button class="btn-primary w-full" @click="saveRecipe">保存并参与推荐</button>
      </template>
    </el-dialog>
  </div>
</template>
