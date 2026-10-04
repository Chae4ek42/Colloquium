import { useMemo, useState } from 'react'
import { QUESTIONS, STATEMENTS, getStatement, questionId } from '../../data/math/bank'
import type { ExamQuestion } from '../../data/math/types'
import { pickWeighted, type DrillMode } from './drill'
import { useProgress } from './progress'
import { StatementBody, StatementLink } from './ui'
import './styles.css'

type PoolKind = 'question' | 'statement'
type Scope = 'all' | 'learned'

function questionPool(scope: Scope, learned: Set<string>): ExamQuestion[] {
  if (scope === 'all') return QUESTIONS
  return QUESTIONS.filter((question) => learned.has(questionId(question.number)))
}

function statementPool(scope: Scope, learned: Set<string>): string[] {
  const ids = STATEMENTS.filter((item) => item.kind !== 'prose').map((item) => item.id)
  if (scope === 'all') return ids
  return ids.filter((id) => learned.has(id))
}

export function DrillPage() {
  const progress = useProgress()
  const [kind, setKind] = useState<PoolKind>('question')
  const [scope, setScope] = useState<Scope>('all')
  const [mode, setMode] = useState<DrillMode>('adaptive')
  const [current, setCurrent] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const ids = useMemo(() => {
    if (kind === 'question') return questionPool(scope, progress.learned).map((item) => questionId(item.number))
    return statementPool(scope, progress.learned)
  }, [kind, scope, progress.learned])

  function nextCard() {
    const id = pickWeighted(ids, progress.state.stats, mode, Math.random())
    setCurrent(id)
    setRevealed(false)
  }

  function grade(known: boolean) {
    if (!current) return
    progress.answer(current, known)
    nextCard()
  }

  const question =
    current && kind === 'question'
      ? QUESTIONS.find((item) => questionId(item.number) === current) ?? null
      : null
  const statement = current && kind === 'statement' ? getStatement(current) : null

  return (
    <main className="math-sheet">
      <h1>Тренировка</h1>
      <div className="math-setup">
        <label>
          Что спрашивать
          <select value={kind} onChange={(event) => setKind(event.target.value as PoolKind)}>
            <option value="question">Вопрос коллоквиума</option>
            <option value="statement">Положение</option>
          </select>
        </label>
        <label>
          Пул
          <select value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
            <option value="all">Все</option>
            <option value="learned">Только выученные</option>
          </select>
        </label>
        <label>
          Выбор
          <select value={mode} onChange={(event) => setMode(event.target.value as DrillMode)}>
            <option value="adaptive">Адаптивный</option>
            <option value="even">Равномерный</option>
          </select>
        </label>
        <button type="button" className="math-start" onClick={nextCard} disabled={!ids.length}>
          {current ? 'Другая карточка' : 'Начать'}
        </button>
      </div>
      {!ids.length ? <p>В этом пуле пока ничего нет. Отметьте выученное на главной или выберите «Все».</p> : null}
      {question ? (
        <article className="math-card">
          <p className="math-kicker">Вопрос {question.number}</p>
          <h2>{question.title}</h2>
          {revealed ? (
            <ol className="math-items">
              {question.items.map((item) => {
                const linked = getStatement(item.statementId)
                return (
                  <li key={item.statementId}>
                    <StatementLink id={item.statementId}>{item.label}</StatementLink>
                    {linked ? <StatementBody statement={linked} /> : null}
                  </li>
                )
              })}
            </ol>
          ) : (
            <button type="button" className="math-start" onClick={() => setRevealed(true)}>
              Показать ответ
            </button>
          )}
          {revealed ? (
            <div className="math-grade">
              <button type="button" onClick={() => grade(true)}>
                Знаю
              </button>
              <button type="button" onClick={() => grade(false)}>
                Не знаю
              </button>
            </div>
          ) : null}
        </article>
      ) : null}
      {statement ? (
        <article className="math-card">
          <p className="math-kicker">{statement.sectionTitle}</p>
          <h2>{statement.title}</h2>
          {revealed ? (
            <StatementBody statement={statement} />
          ) : (
            <button type="button" className="math-start" onClick={() => setRevealed(true)}>
              Показать формулировку
            </button>
          )}
          {revealed ? (
            <div className="math-grade">
              <button type="button" onClick={() => grade(true)}>
                Знаю
              </button>
              <button type="button" onClick={() => grade(false)}>
                Не знаю
              </button>
            </div>
          ) : null}
        </article>
      ) : null}
    </main>
  )
}
