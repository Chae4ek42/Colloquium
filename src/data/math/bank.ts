import statementsJson from './statements.json' with { type: 'json' }
import { DEPENDS } from './depends'
import { FORMULATIONS } from './formulations'
import { EXAM_QUESTIONS } from './questions'
import type { ExamQuestion, StatementKind, StatementRecord } from './types'

const RAW = statementsJson as StatementRecord[]

export interface Statement extends StatementRecord {
  formulation: string | null
  pageSrc: string
}

function pageSrc(bookPage: number): string {
  return `/book/p${String(bookPage).padStart(3, '0')}.jpg`
}

function decorate(record: StatementRecord): Statement {
  return {
    ...record,
    dependsOn: DEPENDS[record.id] ?? [],
    formulation: FORMULATIONS[record.id] ?? null,
    pageSrc: pageSrc(record.bookPage),
  }
}

export const STATEMENTS: Statement[] = RAW.map(decorate)

const BY_ID = new Map(STATEMENTS.map((item) => [item.id, item]))

export function getStatement(id: string): Statement | null {
  return BY_ID.get(id) ?? null
}

export function statementsUsing(id: string): Statement[] {
  return STATEMENTS.filter(
    (item) => item.mentions.includes(id) || item.dependsOn.includes(id),
  )
}

export function followsFrom(id: string): Statement[] {
  const current = getStatement(id)
  if (!current) return []
  return current.dependsOn
    .map((item) => getStatement(item))
    .filter((item): item is Statement => item !== null)
}

export function leadsTo(id: string): Statement[] {
  return STATEMENTS.filter((item) => item.dependsOn.includes(id))
}

export const QUESTIONS: ExamQuestion[] = EXAM_QUESTIONS

export function questionId(number: number): string {
  return `q${number}`
}

export function getQuestion(number: number): ExamQuestion | null {
  return QUESTIONS.find((item) => item.number === number) ?? null
}

export const KIND_LABEL: Record<StatementKind, string> = {
  definition: 'Определение',
  theorem: 'Теорема',
  lemma: 'Лемма',
  corollary: 'Следствие',
  example: 'Пример',
  remark: 'Замечание',
  exercise: 'Задача',
  axiom: 'Аксиома',
  principle: 'Принцип',
  prose: 'Текст',
}

export function flowText(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/([^\n])\n(?!\n)/g, '$1 ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\s+—\s+/g, ' — ')
    .trim()
}
