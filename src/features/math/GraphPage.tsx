import { useMemo, useState } from 'react'
import { STATEMENTS, getStatement } from '../../data/math/bank'
import { StatementLink } from './ui'
import './styles.css'

export function GraphPage() {
  const [query, setQuery] = useState('')
  const edges = useMemo(
    () =>
      STATEMENTS.flatMap((item) =>
        item.dependsOn.map((prior) => ({
          from: prior,
          to: item.id,
        })),
      ),
    [],
  )
  const needle = query.trim().toLowerCase()
  const visible = edges.filter((edge) => {
    if (!needle) return true
    const from = getStatement(edge.from)
    const to = getStatement(edge.to)
    return (
      edge.from.toLowerCase().includes(needle) ||
      edge.to.toLowerCase().includes(needle) ||
      (from?.title.toLowerCase().includes(needle) ?? false) ||
      (to?.title.toLowerCase().includes(needle) ?? false)
    )
  })

  return (
    <main className="math-sheet">
      <h1>Граф развития</h1>
      <p className="home-lead">
        Стрелка идёт от положения, которое уже нужно, к тому, которое из него получается. Это не каждое упоминание в
        тексте, а зависимость доказательства.
      </p>
      <label className="math-search">
        Найти
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Номер или слова из названия" />
      </label>
      <p className="math-kicker">{visible.length} связей</p>
      <ul className="math-edges">
        {visible.map((edge) => {
          const from = getStatement(edge.from)
          const to = getStatement(edge.to)
          return (
            <li key={`${edge.from}-${edge.to}`}>
              <StatementLink id={edge.from}>{from?.title ?? edge.from}</StatementLink>
              <span aria-hidden="true"> → </span>
              <StatementLink id={edge.to}>{to?.title ?? edge.to}</StatementLink>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
