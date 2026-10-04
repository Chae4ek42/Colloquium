import { QUESTIONS, getStatement, questionId } from '../../data/math/bank'
import { useProgress } from './progress'
import { StatementCard } from './StatementCard'
import { LearnedButton, streamText } from './ui'
import '../home/styles.css'
import './styles.css'

export function ColloquiumHome() {
  const progress = useProgress()

  return (
    <main className="home-page math-home">
      <div className="math-questions">
        {QUESTIONS.map((question) => {
          const learnedCount = question.items.filter((item) => progress.isLearned(item.statementId)).length
          const mark = streamText(question.streams)
          return (
            <details key={question.number} className="math-question" data-testid={`question-${question.number}`}>
              <summary>
                <span className="math-question-num">{String(question.number).padStart(2, '0')}</span>
                <span className="math-question-title">{question.title}</span>
                <span className="math-question-count">
                  {learnedCount}/{question.items.length}
                </span>
                <LearnedButton id={questionId(question.number)} />
              </summary>
              <div className="math-question-body">
                {mark ? <p className="math-stream">{mark}</p> : null}
                {question.note ? <p className="math-note">{question.note}</p> : null}
                <div className="math-bento-stack">
                  {question.items.map((item) => {
                    const statement = getStatement(item.statementId)
                    const itemMark = streamText(item.streams)
                    return (
                      <div key={`${question.number}-${item.statementId}-${item.label}`} className="math-question-item">
                        {itemMark ? <p className="math-stream">{itemMark}</p> : null}
                        {statement ? <StatementCard statement={statement} /> : <p>Положение не найдено.</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </main>
  )
}

