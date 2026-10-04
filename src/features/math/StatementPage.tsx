import { useEffect } from 'react'
import { followsFrom, getStatement, leadsTo, statementsUsing, type Statement } from '../../data/math/bank'
import { displayName } from './present'
import { StatementCard } from './StatementCard'
import { StatementLink } from './ui'
import './styles.css'

export function StatementPage({ id, onBack }: { id: string; onBack: () => void }) {
  const statement = getStatement(id)

  useEffect(() => {
    document.title = statement ? `${displayName(statement)} — Коллоквиум` : 'Положение — Коллоквиум'
  }, [statement])

  if (!statement) {
    return (
      <main className="math-sheet">
        <button type="button" className="text-button" onClick={onBack}>
          К вопросам
        </button>
        <p>Такого положения нет.</p>
      </main>
    )
  }

  const priors = followsFrom(statement.id)
  const next = leadsTo(statement.id)
  const used = statementsUsing(statement.id).filter((item) => item.id !== statement.id)

  return (
    <main className="math-sheet">
      <button type="button" className="text-button" onClick={onBack}>
        К вопросам
      </button>
      <StatementCard statement={statement} />
      <div className="math-rel-grid">
        <RelationCard title="Следует из" items={priors} />
        <RelationCard title="Из этого следует" items={next} />
        <RelationCard title="Где используется" items={used} />
      </div>
    </main>
  )
}

function RelationCard({ title, items }: { title: string; items: Statement[] }) {
  return (
    <section className="math-rel-card">
      <h2>{title}</h2>
      {items.length ? (
        <ul className="math-rel">
          {items.map((item) => (
            <li key={item.id}>
              <StatementLink id={item.id}>
                {item.number ? displayName(item) : `${displayName(item)}, стр. ${item.bookPage}`}
              </StatementLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="math-empty">Нет.</p>
      )}
    </section>
  )
}
