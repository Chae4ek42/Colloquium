import { useEffect } from 'react'
import {
  KIND_LABEL,
  followsFrom,
  getStatement,
  leadsTo,
  statementsUsing,
} from '../../data/math/bank'
import { flowText } from '../../data/math/bank'
import { LearnedButton, StatementBody, StatementLink } from './ui'
import './styles.css'

export function StatementPage({ id, onBack }: { id: string; onBack: () => void }) {
  const statement = getStatement(id)

  useEffect(() => {
    document.title = statement ? `${statement.title} — Коллоквиум` : 'Положение — Коллоквиум'
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
  const used = statementsUsing(statement.id)

  return (
    <main className="math-sheet">
      <button type="button" className="text-button" onClick={onBack}>
        К вопросам
      </button>
      <p className="math-kicker">
        {KIND_LABEL[statement.kind]}
        {statement.number ? ` ${statement.number}` : ''} · {statement.sectionId}. {statement.sectionTitle} · стр.{' '}
        {statement.bookPage}
      </p>
      <div className="math-sheet-head">
        <h1>{statement.title}</h1>
        <LearnedButton id={statement.id} />
      </div>
      <section>
        <h2>Формулировка</h2>
        <StatementBody statement={statement} />
      </section>
      {priors.length ? (
        <section>
          <h2>Следует из</h2>
          <ul className="math-rel">
            {priors.map((item) => (
              <li key={item.id}>
                <StatementLink id={item.id}>{item.title}</StatementLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {next.length ? (
        <section>
          <h2>Из этого следует</h2>
          <ul className="math-rel">
            {next.map((item) => (
              <li key={item.id}>
                <StatementLink id={item.id}>{item.title}</StatementLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {used.length ? (
        <section>
          <h2>Где используется</h2>
          <ul className="math-rel">
            {used.map((item) => (
              <li key={item.id}>
                <StatementLink id={item.id}>{item.title}</StatementLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2>Текст пособия</h2>
        <p className="math-source">{flowText(statement.text)}</p>
        <img className="math-page" src={statement.pageSrc} alt={`Страница ${statement.bookPage} пособия`} />
      </section>
    </main>
  )
}
