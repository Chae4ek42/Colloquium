import { useState } from 'react'
import { QUESTIONS, getStatement, questionId } from '../../data/math/bank'
import { useProgress } from './progress'
import { StatementCard } from './StatementCard'
import { STREAM_FILTERS, visibleItems, type StreamFilter } from './streams'
import { LearnedButton, streamText } from './ui'
import '../home/styles.css'
import './styles.css'

const STREAM_KEY = 'colloquium-stream-v1'

function readStream(): StreamFilter {
  try {
    const saved = localStorage.getItem(STREAM_KEY)
    if (STREAM_FILTERS.some((item) => item.id === saved)) return saved as StreamFilter
  } catch {
    /* выбор потока остаётся «все вопросы» */
  }
  return 'all'
}

export function ColloquiumHome() {
  const progress = useProgress()
  const [stream, setStream] = useState<StreamFilter>(readStream)

  function choose(next: StreamFilter) {
    setStream(next)
    localStorage.setItem(STREAM_KEY, next)
  }

  const questions = QUESTIONS.map((question) => ({
    question,
    items: visibleItems(question, stream),
  })).filter((entry) => entry.items.length > 0)

  return (
    <main className="home-page math-home">
      <div className="math-stream-filter" role="group" aria-label="Поток">
        {STREAM_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`stream-${option.id}`}
            className={stream === option.id ? 'math-stream-option is-active' : 'math-stream-option'}
            aria-pressed={stream === option.id}
            onClick={() => choose(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="math-questions">
        {questions.map(({ question, items }) => {
          const learnedCount = items.filter((item) => progress.isLearned(item.statementId)).length
          const mark = stream === 'all' ? streamText(question.streams) : null
          return (
            <details key={question.number} className="math-question" data-testid={`question-${question.number}`}>
              <summary>
                <span className="math-question-num">{String(question.number).padStart(2, '0')}</span>
                <span className="math-question-title">{question.title}</span>
                <span className="math-question-count">
                  {learnedCount}/{items.length}
                </span>
                <LearnedButton id={questionId(question.number)} />
              </summary>
              <div className="math-question-body">
                {mark ? <p className="math-stream">{mark}</p> : null}
                {question.note ? <p className="math-note">{question.note}</p> : null}
                <div className="math-bento-stack">
                  {items.map((item) => {
                    const statement = getStatement(item.statementId)
                    const itemMark = stream === 'all' ? streamText(item.streams) : null
                    return (
                      <div key={`${question.number}-${item.statementId}-${item.label}`} className="math-question-item">
                        {itemMark ? <p className="math-stream">{itemMark}</p> : null}
                        {statement ? <StatementCard statement={statement} fold /> : <p>Положение не найдено.</p>}
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
