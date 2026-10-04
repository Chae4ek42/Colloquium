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
