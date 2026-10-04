import { createContext, useContext, useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useLongPress } from '../../shared/lib/useLongPress'
import { useIsMobileTouch } from '../../shared/lib/media'
import {
  KIND_LABEL,
  flowText,
  getStatement,
  leadsTo,
  statementsUsing,
  type Statement,
} from '../../data/math/bank'
import type { StreamMark } from '../../data/math/types'
import { useProgress } from './progress'

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
  const text = statement.formulation ?? flowText(statement.text)
  return <p className="math-prose">{text}</p>
}

export function LearnedButton({ id }: { id: string }) {
  const progress = useProgress()
  const learned = progress.isLearned(id)
  return (
    <button
      type="button"
      className={learned ? 'math-learned is-on' : 'math-learned'}
      aria-pressed={learned}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        progress.toggle(id)
      }}
    >
      {learned ? 'Выучено' : 'Не выучено'}
    </button>
  )
}

export function StatementLink({
  id,
  children,
  className = 'math-link',
}: {
  id: string
  children: ReactNode
  className?: string
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
      title={mobile ? 'Долгое нажатие — краткий просмотр' : 'Колёсико — краткий просмотр'}
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
  const used = statement ? statementsUsing(id).slice(0, 8) : []
  const next = statement ? leadsTo(id).slice(0, 8) : []

  return (
    <div className="math-quick-backdrop" onClick={onClose}>
      <article
        className="math-quick"
        role="dialog"
        aria-modal="true"
        aria-label="Краткий просмотр"
        onClick={(event) => event.stopPropagation()}
      >
        {statement ? (
          <>
            <header className="math-quick-head">
              <p className="math-kicker">
                {KIND_LABEL[statement.kind]}
                {statement.number ? ` ${statement.number}` : ''} · стр. {statement.bookPage}
              </p>
              <h2>{statement.title}</h2>
              <LearnedButton id={statement.id} />
            </header>
            <StatementBody statement={statement} />
            {next.length ? (
              <p className="math-inline-links">
                Из этого следует:{' '}
                {next.map((item) => (
                  <StatementLink key={item.id} id={item.id}>
                    {item.title}
                  </StatementLink>
                ))}
              </p>
            ) : null}
            {used.length ? (
              <p className="math-inline-links">
                Используется в:{' '}
                {used.map((item) => (
                  <StatementLink key={item.id} id={item.id}>
                    {item.title}
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
