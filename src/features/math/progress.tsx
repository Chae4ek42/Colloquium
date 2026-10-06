import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { listSources } from '../../data/math/bank'
import {
  LEGACY_PROGRESS_KEY,
  progressStorageKey,
  readScopedRaw,
} from '../../data/math/source'
import { EMPTY_PROGRESS, recordAnswer, toggleLearned, type ProgressState } from './progress-model'
import { useMathSource } from './SourceContext'

interface ProgressApi {
  state: ProgressState
  learned: Set<string>
  isLearned: (id: string) => boolean
  toggle: (id: string) => void
  answer: (id: string, known: boolean) => void
}

const ProgressContext = createContext<ProgressApi | null>(null)

function readStoredProgress(sourceId: string): ProgressState {
  const raw = readScopedRaw(
    localStorage,
    sourceId,
    progressStorageKey(sourceId),
    LEGACY_PROGRESS_KEY,
    listSources()[0]?.id ?? sourceId,
  )
  if (!raw) return EMPTY_PROGRESS
  try {
    return readProgressRaw(raw)
  } catch {
    return EMPTY_PROGRESS
  }
}

function readProgressRaw(raw: string): ProgressState {
  const parsed = JSON.parse(raw) as Partial<ProgressState>
  return {
    learned: Array.isArray(parsed.learned) ? parsed.learned.filter((item) => typeof item === 'string') : [],
    stats: parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {},
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { sourceId } = useMathSource()
  const storageKey = progressStorageKey(sourceId)
  const [snapshot, setSnapshot] = useState(() => ({
    key: storageKey,
    state: readStoredProgress(sourceId),
  }))
  if (snapshot.key !== storageKey) {
    setSnapshot({ key: storageKey, state: readStoredProgress(sourceId) })
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
