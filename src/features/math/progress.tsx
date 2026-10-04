import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { EMPTY_PROGRESS, recordAnswer, toggleLearned, type ProgressState } from './progress-model'

const STORAGE_KEY = 'colloquium-progress-v1'

function readProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY_PROGRESS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setState(readProgress())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [ready, state])

  const learned = new Set(state.learned)
  const api: ProgressApi = {
    state,
    learned,
    isLearned: (id) => learned.has(id),
    toggle: (id) => setState((prev) => toggleLearned(prev, id)),
    answer: (id, known) => setState((prev) => recordAnswer(prev, id, known)),
  }

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('Прогресс доступен только внутри ProgressProvider')
  return value
}
