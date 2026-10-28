import { defineEventHandler, getQuery } from 'h3'
import { DISHES } from '../utils/dishes'
import type { Dish } from '~/types/recommend'

/** 菜品库查询：?region=川菜 可按地域过滤，无参数返回全量 */
export default defineEventHandler((event) => {
  const { region } = getQuery(event) as { region?: string }
  let dishes: Dish[] = DISHES
  if (region && region !== '全部') {
    dishes = DISHES.filter((d) => d.region === region)
  }
  return { ok: true, total: dishes.length, dishes }
})
