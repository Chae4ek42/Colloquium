import { useEffect, useMemo, useRef, useState } from 'react'
import { QUESTIONS, STATEMENTS, getStatement, questionId } from '../../data/math/bank'
import { usePracticeSession } from '../../shared/lib/usePracticeSession'
import { PracticeShell } from '../../shared/ui/PracticeShell'
import { ShortcutNote } from '../../shared/ui/ShortcutNote'
import { pickWeighted, type DrillMode } from './drill'
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
}

function buildPool(kind: PoolKind, scope: Scope, learned: Set<string>): string[] {
  const ids =
    kind === 'question'
      ? QUESTIONS.map((question) => questionId(question.number))
      : STATEMENTS.filter((item) => item.kind !== 'prose').map((item) => item.id)
  return scope === 'all' ? ids : ids.filter((id) => learned.has(id))
}

function emptyPoolReason(kind: PoolKind, scope: Scope): string {
  if (scope === 'learned') {
    return kind === 'question'
      ? 'Выученных вопросов пока нет. Отметьте их на главной или выберите «Все».'
      : 'Выученных положений пока нет. Отметьте их в каталоге или выберите «Все».'
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
  const [current, setCurrent] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const ids = useMemo(() => buildPool(kind, scope, progress.learned), [kind, scope, progress.learned])
  const canStart = ids.length > 0

  // Свежие значения для обработчиков клавиатуры и отложенного перехода.
  const latest = useRef<LatestDrill>({
    ids,
    mode,
    current,
    revealed,
    view,
    stats: progress.state.stats,
    reveal: () => {},
    grade: () => {},
  })

  function showNext() {
    const live = latest.current
    const candidates = live.ids.length > 1 ? live.ids.filter((id) => id !== live.current) : live.ids
    const nextId = pickWeighted(candidates, live.stats, live.mode, Math.random())
    if (!nextId) {
      stopPractice()
      return
    }
    setCurrent(nextId)
    setRevealed(false)
    setFeedback({ type: 'idle', text: '' })
  }

  function startPractice() {
    if (!canStart) return
    latest.current = { ...latest.current, ids, mode, current: null }
    beginPractice({ poolIds: ids, mode })
    showNext()
  }

  function stopPractice() {
    clearPendingAdvance()
    endPractice()
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
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const ctx = latest.current
      if (ctx.view !== 'practice' || !ctx.current) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target?.closest('a, input, textarea, select')) return
      const onButton = Boolean(target?.closest('button'))

      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (onButton) return
        event.preventDefault()
        if (!ctx.revealed) ctx.reveal()
        return
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault()
        if (ctx.revealed) ctx.grade(true)
        return
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault()
        if (ctx.revealed) ctx.grade(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (view === 'setup') {
    const countLabel = kind === 'question' ? 'вопросов' : 'положений'
    return (
      <main className="math-sheet drill-page">
        <header className="drill-head">
          <h1 className="drill-title">Тренировка</h1>
          <p className="drill-lead">Вспоминайте формулировки по карточкам, а программа подскажет, что повторить.</p>
        </header>

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
              {canStart ? `${ids.length} ${countLabel} в наборе` : emptyPoolReason(kind, scope)}
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
      </main>
    )
  }

  const question =
    current && kind === 'question'
      ? QUESTIONS.find((item) => questionId(item.number) === current) ?? null
      : null
  const statement = current && kind === 'statement' ? getStatement(current) : null
  const hasCard = Boolean(question || statement)

  return (
    <PracticeShell
      className="drill-practice-panel"
      stageClassName="drill-practice-layout"
      onStop={stopPractice}
      sessionStats={{ ...sessionStats, accuracy: sessionAccuracy }}
      feedbackType={feedback.type}
      swipes={{
        onSwipeLeft: () => grade(false),
        onSwipeRight: () => grade(true),
        onSwipeDown: reveal,
        onSwipeUp: reveal,
      }}
    >
      {hasCard ? (
        <>
          <div className="question-block">
            <p className="question-script">{question ? `Вопрос ${question.number}` : 'Сформулируйте'}</p>
            <h2 className="drill-prompt" data-testid="drill-prompt" aria-live="polite">
              {question ? question.title : statement?.title}
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
                  revealed ? (
                    <>
                      <kbd>→</kbd> — знаю · <kbd>←</kbd> — не знаю
                    </>
                  ) : (
                    <>
                      <kbd>Space</kbd> / <kbd>Enter</kbd> — показать
                    </>
                  )
                }
                swipe={revealed ? <>Свайп → — знаю · ← — не знаю</> : <>Свайп вниз/вверх — показать</>}
              />
            </div>
          </div>
        </>
      ) : null}
    </PracticeShell>
  )
}
