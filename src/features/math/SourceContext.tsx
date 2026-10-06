import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './styles.css'
import { activeSource, listSources, selectSource, type MathSource } from '../../data/math/bank'
import { SOURCE_KEY } from '../../data/math/source'

interface SourceApi {
  sourceId: string
  sources: MathSource[]
  choose: (id: string) => void
}

const SourceContext = createContext<SourceApi | null>(null)

export function SourceProvider({ children }: { children: ReactNode }) {
  const [sourceId, setSourceId] = useState(() => {
    const id = activeSource().id
    try {
      if (localStorage.getItem(SOURCE_KEY) !== id) localStorage.setItem(SOURCE_KEY, id)
    } catch {
      /* выбор останется до перезагрузки */
    }
    return id
  })
  const sources = listSources()

  function choose(id: string) {
    if (!selectSource(id)) return
    try {
      localStorage.setItem(SOURCE_KEY, id)
    } catch {
      /* выбор останется до перезагрузки */
    }
    setSourceId(id)
  }

  return <SourceContext.Provider value={{ sourceId, sources, choose }}>{children}</SourceContext.Provider>
}

export function useMathSource(): SourceApi {
  const value = useContext(SourceContext)
  if (!value) throw new Error('Источник доступен только внутри SourceProvider')
  return value
}

export function SourceSelect() {
  const { sourceId, sources, choose } = useMathSource()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()
  const current = sources.find((source) => source.id === sourceId) ?? sources[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!current) return null

  return (
    <div className={open ? 'math-book is-open' : 'math-book'} ref={rootRef}>
      <button
        type="button"
        className="math-book-trigger"
        data-testid="source-select"
        aria-label="Учебник"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="math-book-title">{current.title}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <ul className="math-book-menu" id={listId} role="listbox" aria-label="Учебник">
          {sources.map((source) => {
            const active = source.id === current.id
            return (
              <li key={source.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={active ? 'math-book-option is-active' : 'math-book-option'}
                  onClick={() => {
                    choose(source.id)
                    setOpen(false)
                  }}
                >
                  <span className="math-book-option-title">{source.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className="math-book-chevron" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={open ? 'M3.5 10.5 L8 6 L12.5 10.5' : 'M3.5 6 L8 10.5 L12.5 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
