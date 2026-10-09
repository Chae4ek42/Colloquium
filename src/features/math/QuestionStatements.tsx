import { getStatement } from '../../data/math/bank'
import type { ExamItem, StreamMark } from '../../data/math/types'
import { StatementCard } from './StatementCard'
import { streamText } from './ui'

export function QuestionStatements({
  questionNumber,
  items,
  note,
  streams,
  showItemMarks,
}: {
  questionNumber: number
  items: ExamItem[]
  note?: string
  streams?: StreamMark
  showItemMarks: boolean
}) {
  const mark = streamText(streams)
  return (
    <div className="math-question-body">
      {mark ? <p className="math-stream">{mark}</p> : null}
      {note ? <p className="math-note">{note}</p> : null}
      <div className="math-bento-stack">
        {items.map((item) => {
          const statement = getStatement(item.statementId)
          const itemMark = showItemMarks ? streamText(item.streams) : null
          return (
            <div key={`${questionNumber}-${item.statementId}-${item.label}`} className="math-question-item">
              {itemMark ? <p className="math-stream">{itemMark}</p> : null}
              {statement ? <StatementCard statement={statement} fold /> : <p>Положение не найдено.</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
