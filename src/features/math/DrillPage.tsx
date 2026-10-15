import { useEffect, useMemo, useRef, useState } from 'react'
import { QUESTIONS, questionId } from '../../data/math/bank'
import { usePracticeSession } from '../../shared/lib/usePracticeSession'
import { PracticeShell } from '../../shared/ui/PracticeShell'
import { ShortcutNote } from '../../shared/ui/ShortcutNote'
import { pickOnce, pickWeighted } from './drill'
import { useProgress } from './progress'
import { QuestionStatements } from './QuestionStatements'
import { StreamPicker, useSavedStream } from './StreamPicker'
import { visibleItems } from './streams'
import './styles.css'
import './drill-ui.css'

type Scope = 'all' | 'learned'
type RepeatMode = 'repeat' | 'once'

const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'learned', label: 'Только выученные' },
]

const REPEAT_OPTIONS: { id: RepeatMode; label: string }[] = [
  { id: 'repeat', label: 'С повторами' },
  { id: 'once', label: 'Единожды' },
]

const ADVANCE_DELAY_MS = 220

interface LatestDrill {
  ids: string[]
  current: string | null
  revealed: boolean
  view: string
  stats: ReturnType<typeof useProgress>['state']['stats']
  once: boolean
  reveal: () => void
  conceal: () => void
  grade: (known: boolean) => void
  step: (direction: -1 | 1) => void
}

function buildPool(scope: Scope, learned: Set<string>, included: number[]): string[] {
  const ids = QUESTIONS.filter((question) => included.includes(question.number)).map((question) =>
    questionId(question.number),
  )
  return scope === 'all' ? ids : ids.filter((id) => learned.has(id))
}

function emptyPoolReason(scope: Scope, streamCount: number, includedCount: number): string {
  if (streamCount === 0) return 'Для этого потока вопросов нет.'
  if (includedCount === 0) return 'Добавьте хотя бы один вопрос справа.'
  if (scope === 'learned') return 'Среди выбранных вопросов выученных нет. Отметьте их на главной или выберите «Все».'
  return 'Здесь пока нечего спрашивать.'
}

export function DrillPage() {
  const progress = useProgress()
  const {
    view,
    pendingAdvanceRef,
    queueAdvance,
    clearPendingAdvance,
    beginPractice,
    endPractice,
    sessionStats,
    sessionAccuracy,
    feedback,
    setFeedback,
    recordAnswered,
  } = usePracticeSession()

  const { stream, choose } = useSavedStream()
  const [scope, setScope] = useState<Scope>('all')
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('repeat')
  const [included, setIncluded] = useState<number[]>(() => QUESTIONS.map((question) => question.number))
  const [current, setCurrent] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const trail = useRef<string[]>([])
  const trailAt = useRef(-1)
  const seenRound = useRef<string[]>([])

  const streamQuestions = useMemo(
    () => QUESTIONS.filter((question) => visibleItems(question, stream).length > 0),
    [stream],
  )
  const includedNumbers = streamQuestions
    .map((question) => question.number)
    .filter((number) => included.includes(number))
  const ids = useMemo(
    () => buildPool(scope, progress.learned, includedNumbers),
    [scope, progress.learned, includedNumbers],
  )
  const canStart = ids.length > 0

  const latest = useRef<LatestDrill>({
    ids,
    current,
    revealed,
    view,
    stats: progress.state.stats,
    once: false,
    reveal: () => {},
    conceal: () => {},
    grade: () => {},
    step: () => {},
  })

  function openCard(id: string) {
    setCurrent(id)
    setRevealed(false)
    setFeedback({ type: 'idle', text: '' })
  }

  function remember(id: string) {
    const next = trail.current.slice(0, trailAt.current + 1)
    next.push(id)
    trail.current = next
    trailAt.current = next.length - 1
  }

  function showNext() {
    const live = latest.current
    const nextId = live.once
      ? pickRoundOnce(live)
      : pickWeighted(
          live.ids.length > 1 ? live.ids.filter((id) => id !== live.current) : live.ids,
          live.stats,
          'even',
          Math.random(),
        )
    if (!nextId) {
      stopPractice()
      return
    }
    remember(nextId)
    openCard(nextId)
  }

  function pickRoundOnce(live: LatestDrill): string | null {
    const picked = pickOnce(live.ids, seenRound.current, live.current, live.stats, Math.random())
    seenRound.current = picked.seen
    return picked.id
  }

  function step(direction: -1 | 1) {
    if (latest.current.view !== 'practice') return
    clearPendingAdvance()
    if (direction < 0) {
      if (trailAt.current <= 0) return
      trailAt.current -= 1
      const previous = trail.current[trailAt.current]
      if (previous) openCard(previous)
      return
    }
    if (trailAt.current < trail.current.length - 1) {
      trailAt.current += 1
      const following = trail.current[trailAt.current]
      if (following) openCard(following)
      return
    }
    showNext()
  }

  function startPractice() {
    if (!canStart) return
    trail.current = []
    trailAt.current = -1
    seenRound.current = []
    latest.current = { ...latest.current, ids, current: null, once: repeatMode === 'once' }
    beginPractice()
    showNext()
  }

  function stopPractice() {
    clearPendingAdvance()
    endPractice()
    trail.current = []
    trailAt.current = -1
    seenRound.current = []
    setCurrent(null)
    setRevealed(false)
  }

  function reveal() {
    if (view !== 'practice' || !current || revealed || pendingAdvanceRef.current) return
    setRevealed(true)
  }

  function conceal() {
    if (view !== 'practice' || !current || !revealed || pendingAdvanceRef.current) return
    setRevealed(false)
  }

  function grade(known: boolean) {
    if (view !== 'practice' || !current || !revealed || pendingAdvanceRef.current) return
    progress.answer(current, known)
    recordAnswered(known ? 1 : 0)
    setFeedback(known ? { type: 'success', text: 'Знаю' } : { type: 'hint', text: 'Не знаю' })
    queueAdvance(showNext, ADVANCE_DELAY_MS)
  }

  latest.current = {
    ids,
    current,
    revealed,
    view,
    stats: progress.state.stats,
    once: repeatMode === 'once',
    reveal,
    conceal,
    grade,
    step,
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const ctx = latest.current
      if (ctx.view !== 'practice' || !ctx.current) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest('a, input, textarea, select')) return
      const onGrade = Boolean(
        target?.closest('[data-testid="drill-known"], [data-testid="drill-unknown"], [data-testid="drill-show"]'),
      )

      if (event.code === 'ArrowLeft') {
        event.preventDefault()
        ctx.step(-1)
        return
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault()
        ctx.step(1)
        return
      }
      if (event.code === 'Space') {
        if (onGrade) return
        event.preventDefault()
        if (ctx.revealed) ctx.conceal()
        else ctx.reveal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function toggleQuestion(number: number) {
    setIncluded((current) =>
      current.includes(number) ? current.filter((item) => item !== number) : [...current, number],
    )
  }

  if (view === 'setup') {
    return (
      <main className="math-sheet drill-page">
        <header className="drill-head">
          <h1 className="drill-title">Тренировка</h1>
          <p className="drill-lead">Вспоминайте формулировки вопросов по карточкам.</p>
        </header>

        <StreamPicker stream={stream} onChoose={choose} />

        <div className="drill-setup-layout">
          <section className="setup-surface controls-panel drill-controls-panel" data-testid="drill-setup">
            <div className="control-group">
              <span className="group-label">Пул</span>
              <div className="segmented">
                {SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    data-testid={`drill-scope-${option.id}`}
                    className={scope === option.id ? 'segmented-button is-active' : 'segmented-button'}
                    onClick={() => setScope(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="control-hint" data-testid="drill-pool-count">
                {canStart
                  ? `${ids.length} вопросов в тренировке`
                  : emptyPoolReason(scope, streamQuestions.length, includedNumbers.length)}
              </p>
            </div>

            <div className="control-group">
              <span className="group-label">Показ</span>
              <div className="segmented">
                {REPEAT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    data-testid={`drill-repeat-${option.id}`}
                    className={repeatMode === option.id ? 'segmented-button is-active' : 'segmented-button'}
                    onClick={() => setRepeatMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="control-hint">
                {repeatMode === 'once'
                  ? 'Каждый билет один раз за круг. Новый круг начинается, когда все выбранные билеты уже были.'
                  : 'Один и тот же билет может выпасть снова, не дожидаясь конца круга.'}
              </p>
            </div>

            <div className="primary-actions">
              <button
                type="button"
                className="primary-button"
                data-testid="drill-start"
                disabled={!canStart}
                onClick={startPractice}
              >
                Начать
              </button>
            </div>
          </section>

          <aside className="drill-questions" data-testid="drill-questions">
            <h2>Вопросы</h2>
            <ul>
              {streamQuestions.map((question) => {
                const on = included.includes(question.number)
                return (
                  <li key={question.number} className={on ? 'is-in' : 'is-out'}>
                    <span className="drill-q-num">{String(question.number).padStart(2, '0')}</span>
                    <span className="drill-q-title">{question.title}</span>
                    <button
                      type="button"
                      data-testid={`drill-question-${question.number}`}
                      aria-pressed={on}
                      onClick={() => toggleQuestion(question.number)}
                    >
                      {on ? 'Убрать' : 'Добавить'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>
        </div>
      </main>
    )
  }

  const question = current ? QUESTIONS.find((item) => questionId(item.number) === current) ?? null : null
  const hasCard = Boolean(question)

  return (
    <PracticeShell
      className="drill-practice-panel"
      stageClassName="drill-practice-layout"
      onStop={stopPractice}
      sessionStats={{ ...sessionStats, accuracy: sessionAccuracy }}
      feedbackType={feedback.type}
      swipes={{
        onSwipeLeft: () => step(-1),
        onSwipeRight: () => step(1),
      }}
    >
      {hasCard ? (
        <>
          <div className="question-block">
            <p className="question-script">{question ? `Вопрос ${question.number}` : ''}</p>
            <h2 className="drill-prompt" data-testid="drill-prompt" aria-live="polite">
              {question ? question.title : ''}
            </h2>
          </div>

          <div className="answer-block drill-answer-block">
            {revealed && question ? (
              <div className="drill-reveal">
                <QuestionStatements
                  questionNumber={question.number}
                  items={visibleItems(question, stream)}
                  note={question.note}
                  streams={stream === 'all' ? question.streams : undefined}
                  showItemMarks={stream === 'all'}
                />
              </div>
            ) : (
              <p className="drill-hint-text">Вспомните ответ, затем нажмите «Показать»</p>
            )}

            <div className="feedback-row">
              <p className={`feedback ${feedback.type ? `is-${feedback.type}` : ''}`}>{feedback.text || ' '}</p>
            </div>

            <div className="answer-actions">
              {revealed ? (
                <>
                  <button type="button" className="ghost-button drill-grade" data-testid="drill-unknown" onClick={() => grade(false)}>
                    Не знаю
                  </button>
                  <button type="button" className="primary-button drill-grade" data-testid="drill-known" onClick={() => grade(true)}>
                    Знаю
                  </button>
                </>
              ) : (
                <button type="button" className="hint-button" data-testid="drill-show" onClick={reveal}>
                  Показать
                </button>
              )}
              <ShortcutNote
                keyboard={
                  <>
                    <kbd>←</kbd>/<kbd>→</kbd> — листать · <kbd>Space</kbd> — показать или скрыть ответ
                  </>
                }
                swipe={<>Свайп ←/→ — листать</>}
              />
            </div>
          </div>
        </>
      ) : null}
    </PracticeShell>
  )
}
