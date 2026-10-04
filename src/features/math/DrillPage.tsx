import { useEffect, useMemo, useRef, useState } from 'react'
import { QUESTIONS, getStatement, questionId } from '../../data/math/bank'
import { usePracticeSession } from '../../shared/lib/usePracticeSession'
import { PracticeShell } from '../../shared/ui/PracticeShell'
import { ShortcutNote } from '../../shared/ui/ShortcutNote'
import { pickWeighted, type DrillMode } from './drill'
import { displayName } from './present'
import { useProgress } from './progress'
import { StatementBody, StatementLink } from './ui'
import './styles.css'
import './drill-ui.css'

type PoolKind = 'question' | 'statement'
type Scope = 'all' | 'learned'

const KIND_OPTIONS: { id: PoolKind; label: string }[] = [
  { id: 'question', label: 'Вопрос коллоквиума' },
  { id: 'statement', label: 'Положение' },
]

const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'learned', label: 'Только выученные' },
]

const MODE_OPTIONS: { id: DrillMode; label: string }[] = [
  { id: 'adaptive', label: 'Адаптивный' },
  { id: 'even', label: 'Равномерный' },
]

const ADVANCE_DELAY_MS = 220

interface LatestDrill {
  ids: string[]
  mode: DrillMode
  current: string | null
  revealed: boolean
  view: string
  stats: ReturnType<typeof useProgress>['state']['stats']
  reveal: () => void
  grade: (known: boolean) => void
  step: (direction: -1 | 1) => void
}

function buildPool(kind: PoolKind, scope: Scope, learned: Set<string>, included: number[]): string[] {
  const chosen = QUESTIONS.filter((question) => included.includes(question.number))
  const ids =
    kind === 'question'
      ? chosen.map((question) => questionId(question.number))
      : [
          ...new Set(
            chosen.flatMap((question) =>
              question.items
                .map((item) => item.statementId)
                .filter((id) => {
                  const statement = getStatement(id)
                  return Boolean(statement && statement.kind !== 'prose' && statement.kind !== 'exercise')
                }),
            ),
          ),
        ]
  return scope === 'all' ? ids : ids.filter((id) => learned.has(id))
}

function emptyPoolReason(kind: PoolKind, scope: Scope, includedCount: number): string {
  if (includedCount === 0) return 'Добавьте хотя бы один вопрос справа.'
  if (scope === 'learned') {
    return kind === 'question'
      ? 'Среди выбранных вопросов выученных нет. Отметьте их на главной или выберите «Все».'
      : 'Среди положений выбранных вопросов выученных нет. Отметьте их в каталоге или выберите «Все».'
  }
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

  const [kind, setKind] = useState<PoolKind>('question')
  const [scope, setScope] = useState<Scope>('all')
  const [mode, setMode] = useState<DrillMode>('adaptive')
  const [included, setIncluded] = useState<number[]>(() => QUESTIONS.map((question) => question.number))
  const [current, setCurrent] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const trail = useRef<string[]>([])
  const trailAt = useRef(-1)

  const ids = useMemo(
    () => buildPool(kind, scope, progress.learned, included),
    [kind, scope, progress.learned, included],
  )
  const canStart = ids.length > 0

  const latest = useRef<LatestDrill>({
    ids,
    mode,
    current,
    revealed,
    view,
    stats: progress.state.stats,
    reveal: () => {},
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
    const candidates = live.ids.length > 1 ? live.ids.filter((id) => id !== live.current) : live.ids
    const nextId = pickWeighted(candidates, live.stats, live.mode, Math.random())
    if (!nextId) {
      stopPractice()
      return
    }
    remember(nextId)
    openCard(nextId)
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
    latest.current = { ...latest.current, ids, mode, current: null }
    beginPractice({ poolIds: ids, mode })
    showNext()
  }

  function stopPractice() {
    clearPendingAdvance()
    endPractice()
    trail.current = []
    trailAt.current = -1
    setCurrent(null)
    setRevealed(false)
  }

  function reveal() {
    if (view !== 'practice' || !current || revealed || pendingAdvanceRef.current) return
    setRevealed(true)
  }

  function grade(known: boolean) {
    if (view !== 'practice' || !current || !revealed || pendingAdvanceRef.current) return
    progress.answer(current, known)
    recordAnswered(known ? 1 : 0)
    setFeedback(known ? { type: 'success', text: 'Знаю' } : { type: 'hint', text: 'Не знаю — вернёмся к этому' })
    queueAdvance(showNext, ADVANCE_DELAY_MS)
  }

  latest.current = {
    ids,
    mode,
    current,
    revealed,
    view,
    stats: progress.state.stats,
    reveal,
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
      const onButton = Boolean(target?.closest('button'))

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
        if (onButton) return
        event.preventDefault()
        if (!ctx.revealed) ctx.reveal()
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
    const countLabel = kind === 'question' ? 'вопросов' : 'положений'
    return (
      <main className="math-sheet drill-page">
        <header className="drill-head">
          <h1 className="drill-title">Тренировка</h1>
          <p className="drill-lead">Вспоминайте формулировки по карточкам, а программа подскажет, что повторить.</p>
        </header>

        <div className="drill-setup-layout">
          <section className="setup-surface controls-panel drill-controls-panel" data-testid="drill-setup">
            <div className="control-group">
              <span className="group-label">Что спрашивать</span>
              <div className="segmented">
                {KIND_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    data-testid={`drill-kind-${option.id}`}
                    className={kind === option.id ? 'segmented-button is-active' : 'segmented-button'}
                    onClick={() => setKind(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

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
                {canStart ? `${ids.length} ${countLabel} в тренировке` : emptyPoolReason(kind, scope, included.length)}
              </p>
            </div>

            <div className="control-group">
              <span className="group-label">Подбор</span>
              <div className="segmented">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    data-testid={`drill-mode-${option.id}`}
                    className={mode === option.id ? 'segmented-button is-active' : 'segmented-button'}
                    onClick={() => setMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
              {QUESTIONS.map((question) => {
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

  const question =
    current && (kind === 'question' || current.startsWith('q'))
      ? QUESTIONS.find((item) => questionId(item.number) === current) ?? null
      : null
  const statement = current && !question ? getStatement(current) : null
  const hasCard = Boolean(question || statement)

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
        onSwipeDown: reveal,
        onSwipeUp: reveal,
      }}
    >
      {hasCard ? (
        <>
          <div className="question-block">
            <p className="question-script">{question ? `Вопрос ${question.number}` : 'Сформулируйте'}</p>
            <h2 className="drill-prompt" data-testid="drill-prompt" aria-live="polite">
              {question ? question.title : statement ? displayName(statement) : ''}
            </h2>
          </div>

          <div className="answer-block drill-answer-block">
            {revealed ? (
              <div className="drill-reveal">
                {question ? (
                  <ol className="math-items">
                    {question.items.map((item) => {
                      const linked = getStatement(item.statementId)
                      return (
                        <li key={item.statementId}>
                          <StatementLink id={item.statementId}>{item.label}</StatementLink>
                          {linked ? <StatementBody statement={linked} /> : null}
                        </li>
                      )
                    })}
                  </ol>
                ) : statement ? (
                  <StatementBody statement={statement} />
                ) : null}
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
                    <kbd>←</kbd>/<kbd>→</kbd> — листать · <kbd>Space</kbd> — ответ
                  </>
                }
                swipe={<>Свайп ←/→ — листать · вниз/вверх — ответ</>}
              />
            </div>
          </div>
        </>
      ) : null}
    </PracticeShell>
  )
}
