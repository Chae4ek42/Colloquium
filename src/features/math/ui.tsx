import { createContext, useContext, useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useLongPress } from '../../shared/lib/useLongPress'
import { useIsMobileTouch } from '../../shared/lib/media'
import {
  flowText,
  getStatement,
  type Statement,
} from '../../data/math/bank'
import type { StreamMark } from '../../data/math/types'
import { useProgress } from './progress'
import { PagePhoto } from './PagePhoto'
import { displayName, splitParts } from './present'
import { leadsTo, usedIn } from './relations'
import { MathText } from './render-math'

interface MathUi {
  openStatement: (id: string) => void
  openQuick: (id: string) => void
}

const MathUiContext = createContext<MathUi | null>(null)

export function useMathUi(): MathUi {
  const value = useContext(MathUiContext)
  if (!value) throw new Error('Навигация по положениям недоступна')
  return value
}

export function MathUiProvider({
  children,
  onOpenStatement,
}: {
  children: ReactNode
  onOpenStatement: (id: string) => void
}) {
  const [stack, setStack] = useState<string[]>([])
  const current = stack[stack.length - 1] ?? null

  useEffect(() => {
    if (!current) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setStack((prev) => prev.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  return (
    <MathUiContext.Provider
      value={{
        openStatement: onOpenStatement,
        openQuick: (id) => setStack((prev) => (prev[prev.length - 1] === id ? prev : [...prev, id])),
      }}
    >
      {children}
      {current ? (
        <QuickView
          id={current}
          onClose={() => setStack([])}
          onBack={() => setStack((prev) => prev.slice(0, -1))}
          canBack={stack.length > 1}
        />
      ) : null}
    </MathUiContext.Provider>
  )
}

export function streamText(mark: StreamMark | undefined): string | null {
  if (!mark) return null
  if (mark.only?.length) return `потоки: ${mark.only.join(', ')}`
  if (mark.except?.length) return `кроме потоков: ${mark.except.join(', ')}`
  return null
}

export function StatementBody({ statement }: { statement: Statement }) {
  if (statement.latex) return <MathText source={statement.latex} />
  const text = statement.formulation ?? flowText(statement.text)
  return <p className="math-prose">{text}</p>
}

export function LearnedButton({ id }: { id: string }) {
  const progress = useProgress()
  const learned = progress.isLearned(id)
  return (
    <button
      type="button"
      className={learned ? 'math-check is-on' : 'math-check'}
      aria-pressed={learned}
      aria-label={learned ? 'Выучено' : 'Не выучено'}
      title={learned ? 'Выучено' : 'Отметить выученным'}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        progress.toggle(id)
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M5 12.5 9.2 17 19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export function StatementLink({
  id,
  children,
  className = 'math-link',
  title,
}: {
  id: string
  children: ReactNode
  className?: string
  title?: string
}) {
  const ui = useMathUi()
  const mobile = useIsMobileTouch()
  const longPress = useLongPress(() => ui.openQuick(id), { enabled: mobile })
  const href = `/p/${encodeURIComponent(id)}`

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    ui.openStatement(id)
  }

  function onAuxClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 1) return
    event.preventDefault()
    ui.openQuick(id)
  }

  return (
    <a
      href={href}
      className={className}
      title={title ?? (mobile ? 'Долгое нажатие — краткий просмотр' : 'Колёсико — краткий просмотр')}
      onClick={onClick}
      onAuxClick={onAuxClick}
      onMouseDown={(event) => {
        if (event.button === 1) event.preventDefault()
      }}
      {...longPress}
    >
      {children}
    </a>
  )
}

function QuickView({
  id,
  onClose,
  onBack,
  canBack,
}: {
  id: string
  onClose: () => void
  onBack: () => void
  canBack: boolean
}) {
  const ui = useMathUi()
  const statement = getStatement(id)
  const used = statement ? usedIn(id).slice(0, 8) : []
  const next = statement ? leadsTo(id).slice(0, 8) : []

  return (
    <div className="math-quick-backdrop" onClick={onClose}>
      <article
        className="math-quick"
        data-kind={statement?.kind}
        role="dialog"
        aria-modal="true"
        aria-label="Краткий просмотр"
        onClick={(event) => event.stopPropagation()}
      >
        {statement ? (
          <>
            <header className="math-quick-head">
              <h2>{displayName(statement)}</h2>
              <div className="math-bento-actions">
                <PagePhoto statement={statement} />
                <LearnedButton id={statement.id} />
              </div>
            </header>
            <QuickParts statement={statement} />
            {next.length ? (
              <p className="math-inline-links">
                Из этого следует:{' '}
                {next.map((item) => (
                  <StatementLink key={item.id} id={item.id}>
                    {displayName(item)}
                  </StatementLink>
                ))}
              </p>
            ) : null}
            {used.length ? (
              <p className="math-inline-links">
                Используется в:{' '}
                {used.map((item) => (
                  <StatementLink key={item.id} id={item.id}>
                    {displayName(item)}
                  </StatementLink>
                ))}
              </p>
            ) : null}
            <footer className="math-quick-actions">
              {canBack ? (
                <button type="button" className="text-button" onClick={onBack}>
                  Назад
                </button>
              ) : null}
              <button type="button" className="text-button" onClick={() => ui.openStatement(id)}>
                Открыть страницу
              </button>
              <button type="button" className="text-button" onClick={onClose}>
                Закрыть
              </button>
            </footer>
          </>
        ) : (
          <p>Положение не найдено.</p>
        )}
      </article>
    </div>
  )
}

function QuickParts({ statement }: { statement: Statement }) {
  const parts = splitParts(statement)
  const formulation = parts.latex ? (
    <MathText source={parts.formulation} contextId={statement.id} />
  ) : (
    <p className="math-prose">{parts.formulation}</p>
  )
  const proof = parts.proof ? (
    parts.latex ? (
      <MathText source={parts.proof} contextId={statement.id} />
    ) : (
      <p className="math-prose">{parts.proof}</p>
    )
  ) : null
  return (
    <div className="math-bento-stack">
      <section className="math-bento-block">
        <h3>Формулировка</h3>
        {formulation}
      </section>
      {proof ? (
        <section className="math-bento-block">
          <h3>Доказательство</h3>
          {proof}
        </section>
      ) : null}
    </div>
  )
}
