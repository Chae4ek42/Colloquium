import statementsJson from './statements.json' with { type: 'json' }
import { DEPENDS } from './depends'
import { FORMULATIONS } from './formulations'
import { LATEX } from './latex'
import { EXAM_QUESTIONS } from './questions'
import { SHORT_NAME } from '../../features/math/names'
import gusevManifest from './sources/gusev-2026/manifest.json' with { type: 'json' }
import gusevStatements from './sources/gusev-2026/statements.json' with { type: 'json' }
import gusevDepends from './sources/gusev-2026/depends.json' with { type: 'json' }
import gusevFormulations from './sources/gusev-2026/formulations.json' with { type: 'json' }
import gusevLatex from './sources/gusev-2026/latex.json' with { type: 'json' }
import gusevNames from './sources/gusev-2026/short-names.json' with { type: 'json' }
import gusevQuestions from './sources/gusev-2026/questions.json' with { type: 'json' }
import {
  SOURCE_KEY,
  activateSource,
  activeSource,
  listSources,
  registerSources,
  type MathSource,
} from './source'
import type { ExamQuestion, StatementKind, StatementRecord } from './types'

export type { MathSource }
export { listSources, activeSource }

const COURSE_SOURCE: MathSource = {
  id: 'f1-lectures',
  title: 'Редкозубов В.В.',
  author: 'старый',
  statements: statementsJson as StatementRecord[],
  depends: DEPENDS,
  formulations: FORMULATIONS,
  latex: LATEX,
  shortNames: SHORT_NAME,
  questions: EXAM_QUESTIONS,
  pagesDir: '/book',
}

const GUSEV_SOURCE: MathSource = {
  id: gusevManifest.id,
  title: 'Гусев Н.А.',
  author: 'новый',
  statements: gusevStatements as StatementRecord[],
  depends: gusevDepends as Record<string, string[]>,
  formulations: gusevFormulations as Record<string, string>,
  latex: gusevLatex as Record<string, string>,
  shortNames: gusevNames as Record<string, string>,
  questions: gusevQuestions as ExamQuestion[],
  pagesDir: gusevManifest.pagesDir,
}

function readSavedSource(): string | null {
  try {
    return localStorage.getItem(SOURCE_KEY)
  } catch {
    return null
  }
}

registerSources([COURSE_SOURCE, GUSEV_SOURCE], readSavedSource())

export interface Statement extends StatementRecord {
  formulation: string | null
  latex: string | null
  pageSrc: string
  pageSrcs: string[]
}

interface Bank {
  sourceId: string
  statements: Statement[]
  byId: Map<string, Statement>
  questions: ExamQuestion[]
}

let bank: Bank = compile(activeSource())

function pageFile(pagesDir: string, bookPage: number): string {
  return `${pagesDir}/p${String(bookPage).padStart(3, '0')}.jpg`
}

function compile(source: MathSource): Bank {
  const statements = source.statements.map((record) => {
    const pages = record.bookPages?.length ? record.bookPages : [record.bookPage]
    const latex = source.latex[record.id]?.trim() ? source.latex[record.id] : null
    return {
      ...record,
      dependsOn: source.depends[record.id] ?? [],
      formulation: source.formulations[record.id] ?? null,
      latex,
      pageSrc: pageFile(source.pagesDir, record.bookPage),
      pageSrcs: pages.map((page) => pageFile(source.pagesDir, page)),
    }
  })
  return {
    sourceId: source.id,
    statements,
    byId: new Map(statements.map((item) => [item.id, item])),
    questions: source.questions,
  }
}

function ensureBank(): Bank {
  const source = activeSource()
  if (bank.sourceId !== source.id) bank = compile(source)
  return bank
}

function liveArray<T>(read: () => readonly T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, prop) {
      const list = read() as T[]
      if (prop === Symbol.iterator) return list[Symbol.iterator].bind(list)
      const value = Reflect.get(list, prop)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(list) : value
    },
    has(_target, prop) {
      return Reflect.has(read() as object, prop)
    },
  })
}

export const STATEMENTS: Statement[] = liveArray(() => ensureBank().statements)
export const QUESTIONS: ExamQuestion[] = liveArray(() => ensureBank().questions)

export function getStatement(id: string): Statement | null {
  return ensureBank().byId.get(id) ?? null
}

export function shortName(id: string): string | undefined {
  return activeSource().shortNames[id]
}

const baseActivate = activateSource
export function selectSource(id: string): boolean {
  const changed = baseActivate(id)
  if (!changed) return false
  bank = compile(activeSource())
  try {
    localStorage.setItem(SOURCE_KEY, id)
  } catch {
    /* выбор останется до перезагрузки */
  }
  return true
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
