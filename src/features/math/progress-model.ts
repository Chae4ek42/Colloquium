export interface DrillStat {
  shows: number
  known: number
  unknown: number
}

export interface ProgressState {
  learned: string[]
  stats: Record<string, DrillStat>
}

export const EMPTY_PROGRESS: ProgressState = { learned: [], stats: {} }

export function toggleLearned(state: ProgressState, id: string): ProgressState {
  const learned = state.learned.includes(id)
    ? state.learned.filter((item) => item !== id)
    : [...state.learned, id]
  return { ...state, learned }
}

export function recordAnswer(state: ProgressState, id: string, known: boolean): ProgressState {
  const prev = state.stats[id] ?? { shows: 0, known: 0, unknown: 0 }
  return {
    ...state,
    stats: {
      ...state.stats,
      [id]: {
        shows: prev.shows + 1,
        known: prev.known + (known ? 1 : 0),
        unknown: prev.unknown + (known ? 0 : 1),
      },
    },
  }
}
