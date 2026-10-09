import { useState } from 'react'
import { QUESTIONS, listSources, questionId } from '../../data/math/bank'
import { LEGACY_STREAM_KEY, readScopedRaw, streamStorageKey } from '../../data/math/source'
import { QuestionStatements } from './QuestionStatements'
import { useProgress } from './progress'
import { useMathSource } from './SourceContext'
import { STREAM_FILTERS, visibleItems, type StreamFilter } from './streams'
import { LearnedButton } from './ui'
import '../home/styles.css'
import './styles.css'

function readStream(sourceId: string): StreamFilter {
  try {
    const saved = readScopedRaw(
      localStorage,
      sourceId,
      streamStorageKey(sourceId),
      LEGACY_STREAM_KEY,
      listSources()[0]?.id ?? sourceId,
    )
    if (STREAM_FILTERS.some((item) => item.id === saved)) return saved as StreamFilter
  } catch {
    /* выбор потока остаётся «все вопросы» */
  }
  return 'all'
}

export function ColloquiumHome() {
  const progress = useProgress()
  const { sourceId } = useMathSource()
  const [stream, setStream] = useState<StreamFilter>(() => readStream(sourceId))

  function choose(next: StreamFilter) {
    setStream(next)
    localStorage.setItem(streamStorageKey(sourceId), next)
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
              <QuestionStatements
                questionNumber={question.number}
                items={items}
                note={question.note}
                streams={stream === 'all' ? question.streams : undefined}
                showItemMarks={stream === 'all'}
              />
            </details>
          )
        })}
      </div>
    </main>
  )
}
