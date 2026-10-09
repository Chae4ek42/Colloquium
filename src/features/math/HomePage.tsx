import { QUESTIONS, questionId } from '../../data/math/bank'
import { QuestionStatements } from './QuestionStatements'
import { useProgress } from './progress'
import { StreamPicker, useSavedStream } from './StreamPicker'
import { visibleItems } from './streams'
import { LearnedButton } from './ui'
import '../home/styles.css'
import './styles.css'

export function ColloquiumHome() {
  const progress = useProgress()
  const { stream, choose } = useSavedStream()

  const questions = QUESTIONS.map((question) => ({
    question,
    items: visibleItems(question, stream),
  })).filter((entry) => entry.items.length > 0)

  return (
    <main className="home-page math-home">
      <StreamPicker stream={stream} onChoose={choose} />
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
