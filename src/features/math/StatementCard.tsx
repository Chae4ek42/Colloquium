import type { Statement } from '../../data/math/bank'
import { examplesOf } from './examples'
import { PagePhoto } from './PagePhoto'
import { displayName, splitParts } from './present'
import { MathText } from './render-math'
import { LearnedButton, StatementLink } from './ui'

export function StatementCard({ statement }: { statement: Statement }) {
  const parts = splitParts(statement)
  const examples = examplesOf(statement.id)
  const section = clip(statement.sectionTitle)

  return (
    <article className="math-bento" data-kind={statement.kind} data-testid={`statement-card-${statement.id}`}>
      <header className="math-bento-head">
        <div className="math-bento-name-wrap">
          <p className="math-kicker">
            стр. {statement.bookPage}
            {section ? ` · ${section}` : ''}
          </p>
          <StatementLink id={statement.id} className="math-bento-name">
            {displayName(statement)}
          </StatementLink>
        </div>
        <div className="math-bento-actions">
          <PagePhoto statement={statement} />
          <LearnedButton id={statement.id} />
        </div>
      </header>
      <section className="math-bento-block">
        <h3>Формулировка</h3>
        <Body source={parts.formulation} latex={parts.latex} />
      </section>
      {parts.proof ? (
        <section className="math-bento-block">
          <h3>Доказательство</h3>
          <Body source={parts.proof} latex={parts.latex} />
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
                  <Body source={exampleParts.formulation} latex={exampleParts.latex} />
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </article>
  )
}

function Body({ source, latex }: { source: string; latex: boolean }) {
  if (latex) return <MathText source={source} />
  return <p className="math-prose">{source}</p>
}

function clip(title: string): string {
  const clean = title.replace(/\s+/g, ' ').trim()
  if (clean.length <= 52) return clean
  const slice = clean.slice(0, 50)
  const word = slice.lastIndexOf(' ')
  return `${(word > 24 ? slice.slice(0, word) : slice).trimEnd()}…`
}
