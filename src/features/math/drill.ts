import type { DrillStat } from './progress-model'

export type DrillMode = 'adaptive' | 'even'

export function cardWeight(stat: DrillStat | undefined, mode: DrillMode): number {
  const shows = stat?.shows ?? 0
  const unknown = stat?.unknown ?? 0
  if (mode === 'even') return 1 / (1 + shows)
  return 1 + unknown * 3 + (shows === 0 ? 2 : 0)
}

/** `random` — число из полуинтервала [0, 1). */
export function pickWeighted(
  ids: string[],
  stats: Record<string, DrillStat>,
  mode: DrillMode,
  random: number,
): string | null {
  if (!ids.length) return null
  const weights = ids.map((id) => cardWeight(stats[id], mode))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor = Math.min(Math.max(random, 0), 0.999999) * total
  for (let index = 0; index < ids.length; index += 1) {
    cursor -= weights[index] ?? 0
    if (cursor < 0) return ids[index] ?? null
  }
  return ids[ids.length - 1] ?? null
}

/**
 * Следующий билет режима «единожды».
 * Пока в круге остались непоказанные билеты, повтор не выбирается.
 * Когда круг пройден, начинается новый: предыдущие снова можно показать,
 * но только что показанный билет не ставится первым, если в пуле есть другие.
 */
export function pickOnce(
  ids: string[],
  seen: readonly string[],
  current: string | null,
  stats: Record<string, DrillStat>,
  random: number,
): { id: string | null; seen: string[] } {
  if (!ids.length) return { id: null, seen: [] }
  const allowed = new Set(ids)
  const seenNow = seen.filter((id) => allowed.has(id))
  let remaining = ids.filter((id) => !seenNow.includes(id))
  let round = seenNow
  if (!remaining.length) {
    remaining = ids.filter((id) => id !== current)
    if (!remaining.length) remaining = ids
    round = []
  }
  const id = pickWeighted(remaining, stats, 'even', random)
  if (!id) return { id: null, seen: round }
  return { id, seen: [...round, id] }
}
