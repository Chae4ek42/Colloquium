import { QUESTIONS, flowText, getStatement, questionId } from '../../data/math/bank'
import { PROGRAM_NOTE } from '../../data/math/questions'
import { useProgress } from './progress'
import { LearnedButton, StatementBody, StatementLink, streamText } from './ui'
import '../home/styles.css'
import './styles.css'

export function ColloquiumHome() {
  const progress = useProgress()

  return (
    <main className="home-page math-home">
      <section className="home-hero">
        <h1 className="home-title">Коллоквиум</h1>
        <p className="home-lead">
          Введение в математический анализ, 1 курс, 2026–2027. Вопросы листа от 1 октября 2026 года.
        </p>
      </section>
      <p className="math-program">{PROGRAM_NOTE}</p>
      <div className="math-questions">
        {QUESTIONS.map((question) => {
          const learnedCount = question.items.filter((item) => progress.isLearned(item.statementId)).length
          const mark = streamText(question.streams)
          return (
            <details key={question.number} className="math-question" data-testid={`question-${question.number}`}>
              <summary>
                <span className="math-question-num">{question.number}</span>
                <span className="math-question-title">{question.title}</span>
                <span className="math-question-count">
                  {learnedCount}/{question.items.length}
                </span>
              </summary>
              <div className="math-question-body">
                {mark ? <p className="math-stream">{mark}</p> : null}
                {question.note ? <p className="math-note">{question.note}</p> : null}
                <div className="math-question-tools">
                  <LearnedButton id={questionId(question.number)} />
                </div>
                <ul className="math-items">
                  {question.items.map((item) => {
                    const statement = getStatement(item.statementId)
                    const itemMark = streamText(item.streams)
                    return (
                      <li key={`${question.number}-${item.statementId}-${item.label}`}>
                        <div className="math-item-head">
                          <StatementLink id={item.statementId}>{item.label}</StatementLink>
                          <LearnedButton id={item.statementId} />
                        </div>
                        {itemMark ? <p className="math-stream">{itemMark}</p> : null}
                        {statement ? <StatementBody statement={statement} /> : <p>Положение не найдено.</p>}
                        {statement ? (
                          <details className="math-source-fold">
                            <summary>Текст и доказательство из пособия, стр. {statement.bookPage}</summary>
                            <p className="math-source">{flowText(statement.text)}</p>
                          </details>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </details>
          )
        })}
      </div>
    </main>
  )
}
