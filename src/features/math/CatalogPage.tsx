import { useDeferredValue, useMemo, useState } from 'react'
import { STATEMENTS } from '../../data/math/bank'
import type { StatementKind } from '../../data/math/types'
import { useProgress } from './progress'
import { searchStatements } from './search'
import { StatementCard } from './StatementCard'
import '../vocab/styles.css'
import './styles.css'

const KIND_FILTERS: Array<{ id: 'all' | StatementKind; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'definition', label: 'Определения' },
  { id: 'axiom', label: 'Аксиомы' },
  { id: 'theorem', label: 'Теоремы' },
  { id: 'lemma', label: 'Леммы' },
  { id: 'corollary', label: 'Следствия' },
  { id: 'principle', label: 'Принципы' },
]

export function CatalogPage({ mode }: { mode: 'all' | 'learned' }) {
  const progress = useProgress()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]['id']>('all')
  const deferredQuery = useDeferredValue(query)

  const catalog = useMemo(
    () =>
      STATEMENTS.filter(
        (item) => item.kind !== 'exercise' && item.kind !== 'prose' && item.kind !== 'example',
      ),
    [],
  )
  const learnedItems = useMemo(
    () => catalog.filter((item) => progress.learned.has(item.id)),
    [catalog, progress.learned],
  )

  const base = mode === 'learned' ? learnedItems : catalog

  const visible = useMemo(() => {
    const filtered = kind === 'all' ? base : base.filter((item) => item.kind === kind)
    const found = deferredQuery.trim() ? searchStatements(deferredQuery, filtered, 80) : filtered
    return found
  }, [base, deferredQuery, kind])

  const title = mode === 'learned' ? 'Выученные' : 'Каталог'
  const emptyLearned = mode === 'learned' && learnedItems.length === 0

  return (
    <main className="vocab-page math-catalog" data-testid={mode === 'learned' ? 'math-learned' : 'math-catalog'}>
      <header className="vocab-hero">
        <div className="vocab-hero-copy">
          <h2 className="vocab-title">
            {title}
            <span className="vocab-section-count">{mode === 'learned' ? learnedItems.length : visible.length}</span>
          </h2>
        </div>
      </header>

      <section className="vocab-controls">
        <label className="vocab-search">
          <span className="visually-hidden">Поиск положения</span>
          <input
            type="search"
            value={query}
            data-testid="math-search"
            placeholder="Номер, название или слова из формулировки"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="vocab-mode-row" aria-label="Вид положений">
          {KIND_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={kind === item.id ? 'vocab-mode-link is-active' : 'vocab-mode-link'}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {emptyLearned ? (
        <p className="math-empty">
          Пока ничего не отмечено. Отметка ставится вручную и не появляется сама после верного ответа в тренировке.
        </p>
      ) : visible.length === 0 ? (
        <p className="math-empty">Ничего не нашлось. Попробуйте номер теоремы или другое слово.</p>
      ) : (
        <div className="math-bento-stack">
          {visible.map((item) => (
            <StatementCard key={item.id} statement={item} />
          ))}
        </div>
      )}
    </main>
  )
}
