import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { EMPTY_PROGRESS, recordAnswer, toggleLearned, type ProgressState } from './progress-model'
import { progressKey } from './local-accounts'

function readProgress(storageKey: string): ProgressState {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return EMPTY_PROGRESS
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    return {
      learned: Array.isArray(parsed.learned) ? parsed.learned.filter((item) => typeof item === 'string') : [],
      stats: parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {},
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

interface ProgressApi {
  state: ProgressState
  learned: Set<string>
  isLearned: (id: string) => boolean
  toggle: (id: string) => void
  answer: (id: string, known: boolean) => void
}

const ProgressContext = createContext<ProgressApi | null>(null)

export function ProgressProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  const storageKey = progressKey(accountId)
  const [snapshot, setSnapshot] = useState(() => ({
    key: storageKey,
    state: readProgress(storageKey),
  }))
  if (snapshot.key !== storageKey) {
    setSnapshot({ key: storageKey, state: readProgress(storageKey) })
  }
  const state = snapshot.state

  useEffect(() => {
    localStorage.setItem(snapshot.key, JSON.stringify(snapshot.state))
  }, [snapshot])

  function update(recipe: (prev: ProgressState) => ProgressState) {
    setSnapshot((current) => ({ key: current.key, state: recipe(current.state) }))
  }

  const learned = new Set(state.learned)
  const api: ProgressApi = {
    state,
    learned,
    isLearned: (id) => learned.has(id),
    toggle: (id) => update((prev) => toggleLearned(prev, id)),
    answer: (id, known) => update((prev) => recordAnswer(prev, id, known)),
  }

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('Прогресс доступен только внутри ProgressProvider')
  return value
}
