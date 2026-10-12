import { useEffect, useRef, useState } from 'react'

export type PracticeView = 'setup' | 'practice'

export interface SessionStats {
  answered: number
  clean: number
  streak: number
}

export type FeedbackType = 'idle' | 'success' | 'wrong' | 'hint' | 'error'

export interface FeedbackState {
  type: FeedbackType
  text: string
}

export const EMPTY_SESSION_STATS: SessionStats = { answered: 0, clean: 0, streak: 0 }

export function sessionAccuracy(sessionStats: SessionStats): number {
  return sessionStats.answered
    ? Math.round((sessionStats.clean / sessionStats.answered) * 100)
    : 100
}

export function usePracticeSession() {
  const [view, setView] = useState<PracticeView>('setup')
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_SESSION_STATS)
  const [feedback, setFeedback] = useState<FeedbackState>({ type: 'idle', text: '' })
  const pendingAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingAdvanceRef.current) {
        clearTimeout(pendingAdvanceRef.current)
      }
    }
  }, [])

  function queueAdvance(callback: () => void, delay = 220) {
    if (pendingAdvanceRef.current) {
      clearTimeout(pendingAdvanceRef.current)
    }
    pendingAdvanceRef.current = setTimeout(() => {
      pendingAdvanceRef.current = null
      callback()
    }, delay)
  }

  function clearPendingAdvance() {
    if (pendingAdvanceRef.current) {
      clearTimeout(pendingAdvanceRef.current)
      pendingAdvanceRef.current = null
    }
  }

  function beginPractice() {
    setView('practice')
    setSessionStats(EMPTY_SESSION_STATS)
    setFeedback({ type: 'idle', text: '' })
  }

  function endPractice() {
    clearPendingAdvance()
    setView('setup')
    setFeedback({ type: 'idle', text: '' })
  }

  function recordAnswered(cleanDelta = 0) {
    setSessionStats((prev) => ({
      answered: prev.answered + 1,
      clean: prev.clean + cleanDelta,
      streak: cleanDelta > 0 ? prev.streak + 1 : 0,
    }))
  }

  return {
    view,
    sessionStats,
    feedback,
    setFeedback,
    pendingAdvanceRef,
    queueAdvance,
    clearPendingAdvance,
    beginPractice,
    endPractice,
    recordAnswered,
    sessionAccuracy: sessionAccuracy(sessionStats),
  }
}
