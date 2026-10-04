import { useState } from 'react'
import type { Statement } from '../../data/math/bank'
import { examplesOf } from './examples'
import { PagePhoto } from './PagePhoto'
import { displayName, splitParts } from './present'
import { MathText } from './render-math'
import { LearnedButton, StatementLink } from './ui'

export function StatementCard({ statement, fold = false }: { statement: Statement; fold?: boolean }) {
  const parts = splitParts(statement)
  const examples = examplesOf(statement.id)
  const [open, setOpen] = useState(false)
  const expanded = !fold || open

  return (
    <article
      className={fold && !open ? 'math-bento is-folded' : 'math-bento'}
      data-kind={statement.kind}
      data-testid={`statement-card-${statement.id}`}
    >
      <header className="math-bento-head">
        <div className="math-bento-name-wrap">
          {fold ? (
            <button
              type="button"
              className="math-bento-toggle"
              aria-expanded={open}
              data-testid={`statement-fold-${statement.id}`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setOpen((value) => !value)
              }}
            >
              {displayName(statement)}
            </button>
          ) : (
            <p className="math-bento-toggle">{displayName(statement)}</p>
          )}
        </div>
        <div className="math-bento-actions">
          {fold ? <OpenIcon id={statement.id} /> : null}
          <PagePhoto statement={statement} />
          <LearnedButton id={statement.id} />
        </div>
      </header>
      {expanded ? (
        <>
          <section className="math-bento-block">
            <h3>Формулировка</h3>
            <Body source={parts.formulation} latex={parts.latex} contextId={statement.id} />
          </section>
          {parts.proof ? (
            <section className="math-bento-block">
              <h3>Доказательство</h3>
              <Body source={parts.proof} latex={parts.latex} contextId={statement.id} />
            </section>
          ) : null}
          {examples.length ? (
            <section className="math-bento-block">
              <h3>Примеры</h3>
              <div className="math-examples">
                {examples.map((example, index) => {
                  const exampleParts = splitParts(example)
                  return (
                    <div key={example.id} className="math-example">
                      <StatementLink id={example.id} className="math-example-name">
                        {examples.length > 1 ? `Пример ${index + 1}` : 'Пример'}
                      </StatementLink>
                      <Body source={exampleParts.formulation} latex={exampleParts.latex} contextId={example.id} />
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </article>
  )
}

function OpenIcon({ id }: { id: string }) {
  return (
    <StatementLink id={id} className="math-open" title="Открыть страницу">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M14 5h5v5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 5 10 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M18 13.5V19H5V6h5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="visually-hidden">Открыть страницу</span>
    </StatementLink>
  )
}

function Body({ source, latex, contextId }: { source: string; latex: boolean; contextId: string }) {
  if (latex) return <MathText source={source} contextId={contextId} />
  return <p className="math-prose">{source}</p>
}
