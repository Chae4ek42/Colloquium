import { STATEMENTS, getStatement, shortName, type Statement } from '../../data/math/bank'
import type { StatementKind } from '../../data/math/types'
import { splitParts } from './present'

export interface Citation {
  start: number
  end: number
  id: string
  phrase: string
  note: string
}

const WHY: Record<string, string> = {
  'thm-1.1': 'Объединение и пересечение меняются местами при дополнении, поэтому равенство множеств переписывается двойственно.',
  'thm-1.2': 'У непустого подмножества натуральных чисел есть наименьший элемент, и им можно начать индукцию.',
  'thm-1.3': 'Инъекция начального отрезка в более короткий невозможна, поэтому мощности сравниваются.',
  'thm-1.5': 'У непустого ограниченного сверху множества есть точная верхняя грань, поэтому супремум здесь существует.',
  'thm-1.6': 'Какое бы большое число ни взять, некоторый натуральный кратный его превосходит.',
  'lem-1.4': 'Неравенство Бернулли даёт нижнюю оценку степени, и из неё получается предел.',
  'thm-2.1': 'У последовательности не может быть двух разных пределов.',
  'thm-2.3': 'Неравенство между членами сохраняется у пределов, а равенство предела нулю вытесняет знак.',
  'thm-2.4': 'Последовательность зажата между двумя, сходящимися к одному пределу, значит сходится к нему же.',
  'thm-2.5': 'Предел суммы, произведения и частного равен той же операции над пределами.',
  'thm-2.6': 'Монотонная и ограниченная последовательность сходится.',
  'thm-2.7': 'У вложенных отрезков есть общая точка; если они стягиваются, она единственная.',
  'thm-2.9': 'У ограниченной последовательности есть сходящаяся подпоследовательность.',
  'lem-2.2': 'Подпоследовательность сохраняет предел исходной последовательности.',
  'lem-2.6': 'Подмножество натурального ряда конечно или счётно, поэтому образ инъекции не больше чем счётен.',
  'thm-2.11': 'В R последовательность сходится тогда и только тогда, когда она фундаментальна.',
  'thm-2.15': 'Пары натуральных чисел можно занумеровать, поэтому их множество счётно.',
  'cor-2.5-1': 'Предел существует в расширенной прямой ровно тогда, когда верхний и нижний пределы совпали.',
  'thm-3.1': 'Замкнутость равносильна тому, что предел последовательности точек множества снова лежит в нём.',
  'lem-3.1': 'Объединение открытых множеств открыто, а конечное пересечение тоже.',
  'thm-3.2': 'Из открытого покрытия отрезка можно выбрать конечное подпокрытие.',
  'def-4.1': 'Предел по Коши задаётся неравенствами с ε и δ, без последовательностей.',
  'def-4.2': 'Предел по Гейне сводит предел функции к пределу последовательности значений.',
  'thm-4.1': 'Определения Коши и Гейне равносильны, поэтому можно пользоваться любым.',
  'thm-4.2': 'Конечный предел функции есть тогда и только тогда, когда значения сближаются по критерию Коши.',
  'thm-4.4': 'Непрерывность в точке равносильна тому, что предел вдоль любой последовательности из области равен значению.',
  'thm-4.8': 'Непрерывная на отрезке функция принимает все промежуточные значения.',
  'thm-4.9': 'Строго монотонная непрерывная функция на промежутке имеет непрерывную обратную.',
  'cor-4.4-1': 'У монотонной функции в каждой внутренней точке есть конечные односторонние пределы.',
  'cor-4.6-1': 'Непрерывный образ промежутка снова промежуток.',
}

const COROLLARY_OF: Record<string, string> = {
  '2.10': 'cor-2.5-1',
  '4.3': 'cor-4.4-1',
  '4.8': 'cor-4.6-1',
}

const NAMED: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /Больцано\s*[—–-]?\s*Вейерштрасс[а-яё]*/gi, id: 'thm-2.9' },
  { pattern: /Гейне\s*[—–-]?\s*Борел[а-яё]*/gi, id: 'thm-3.2' },
  { pattern: /де\s+Морган[а-яё]*/gi, id: 'thm-1.1' },
  { pattern: /Бернулли/gi, id: 'lem-1.4' },
  { pattern: /Архимед[а-яё]*/gi, id: 'thm-1.6' },
  { pattern: /Штольц[а-яё]*/gi, id: 'thm-2.8' },
]

function normalizeNumber(value: string): string {
  return value.replace(/[′']/g, "'").replace(/\s+/g, '')
}

function kindOf(word: string): StatementKind | null {
  const lower = word.toLowerCase()
  if (lower.startsWith('теорем')) return 'theorem'
  if (lower.startsWith('лемм')) return 'lemma'
  if (lower.startsWith('следстви')) return 'corollary'
  if (lower.startsWith('определени')) return 'definition'
  if (lower.startsWith('аксиом')) return 'axiom'
  if (lower.startsWith('принцип')) return 'principle'
  return null
}

function byKindAndNumber(kind: StatementKind, number: string, context: Statement | null): Statement | null {
  const wanted = normalizeNumber(number)
  const hits = STATEMENTS.filter(
    (item) => item.kind === kind && item.number && normalizeNumber(item.number) === wanted,
  )
  if (!hits.length) return null
  if (hits.length === 1) return hits[0] ?? null
  const sameSection = context ? hits.find((item) => item.sectionId === context.sectionId) : undefined
  return sameSection ?? hits[0] ?? null
}

function plainFormulation(statement: Statement): string {
  return splitParts(statement)
    .formulation.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function previousOfKind(contextId: string | undefined, kind: StatementKind): string | null {
  if (!contextId) return null
  const index = STATEMENTS.findIndex((item) => item.id === contextId)
  if (index < 0) return null
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const item = STATEMENTS[cursor]
    if (item?.kind === kind) return item.id
  }
  return null
}

function noteFor(statement: Statement): string {
  const reason = WHY[statement.id]
  if (reason) return reason
  const name = shortName(statement.id)
  const sentence = plainFormulation(statement).slice(0, 160)
  return name ? `${name}. ${sentence}` : sentence
}

function push(
  hits: Citation[],
  contextId: string | undefined,
  start: number,
  end: number,
  id: string,
  phrase: string,
) {
  if (!id || id === contextId || end <= start) return
  const target = getStatement(id)
  if (!target) return
  hits.push({ start, end, id, phrase, note: noteFor(target) })
}

export function findCitations(text: string, contextId?: string): Citation[] {
  const context = contextId ? getStatement(contextId) : null
  const hits: Citation[] = []

  const corollaryOf = /следстви[а-яё]*\s+теоремы\s+(\d+\.\d+)/gi
  for (const match of text.matchAll(corollaryOf)) {
    const number = match[1] ?? ''
    const id = COROLLARY_OF[number] ?? byKindAndNumber('theorem', number, context)?.id
    if (!id || match.index == null) continue
    push(hits, contextId, match.index, match.index + match[0].length, id, match[0])
  }

  const numbered =
    /(теорем|лемм|следстви|определени|аксиом|принцип)[а-яё]*\s+(\d+\.\d+[′']?|\d+)(?:\s+(?:Больцано\s*[—–-]\s*Вейерштрасс[а-яё]*|Кантор[а-яё]*|Гейне\s*[—–-]\s*Борел[а-яё]*|де\s+Морган[а-яё]*))?/gi
  for (const match of text.matchAll(numbered)) {
    const kind = kindOf(match[1] ?? '')
    const number = match[2] ?? ''
    if (!kind || match.index == null) continue
    const target = byKindAndNumber(kind, number, context)
    if (!target) continue
    push(hits, contextId, match.index, match.index + match[0].length, target.id, match[0])
  }

  const cauchy =
    /критери[а-яё]*\s+Коши(?:\s+для\s+последовательност[а-яё]*)?/gi
  for (const match of text.matchAll(cauchy)) {
    if (match.index == null) continue
    const aboutSequences = /последовательност/i.test(match[0]) || (context?.sectionId ?? '').startsWith('2')
    const id = aboutSequences ? 'thm-2.11' : 'thm-4.2'
    push(hits, contextId, match.index, match.index + match[0].length, id, match[0])
  }

  const heine = /определени[а-яё]*\s+Гейне/gi
  for (const match of text.matchAll(heine)) {
    if (match.index == null) continue
    push(hits, contextId, match.index, match.index + match[0].length, 'def-4.2', match[0])
  }

  const cauchyDef = /определени[а-яё]*\s+Коши/gi
  for (const match of text.matchAll(cauchyDef)) {
    if (match.index == null) continue
    push(hits, contextId, match.index, match.index + match[0].length, 'def-4.1', match[0])
  }

  for (const named of NAMED) {
    for (const match of text.matchAll(named.pattern)) {
      if (match.index == null) continue
      push(hits, contextId, match.index, match.index + match[0].length, named.id, match[0])
    }
  }

  const cantor = /Кантор[а-яё]*/gi
  for (const match of text.matchAll(cantor)) {
    if (match.index == null) continue
    const before = text.slice(Math.max(0, match.index - 24), match.index)
    if (/Больцано/i.test(before)) continue
    const after = text.slice(match.index, match.index + match[0].length + 48)
    const nested = /вложенн/i.test(after)
    const chapter4 = (context?.sectionId ?? '').startsWith('4')
    const id = nested || !chapter4 ? 'thm-2.7' : 'thm-4.10'
    push(hits, contextId, match.index, match.index + match[0].length, id, match[0])
  }

  const short =
    /(?<![а-яёa-z])т\.\s*(\d+\.\d+[′']?)/gi
  for (const match of text.matchAll(short)) {
    const number = match[1] ?? ''
    if (match.index == null) continue
    const target = byKindAndNumber('theorem', number, context)
    if (!target) continue
    push(hits, contextId, match.index, match.index + match[0].length, target.id, match[0])
  }

  const weierstrass = /Вейерштрасс[а-яё]*/gi
  for (const match of text.matchAll(weierstrass)) {
    if (match.index == null) continue
    const before = text.slice(Math.max(0, match.index - 24), match.index)
    if (/Больцано/i.test(before)) continue
    push(hits, contextId, match.index, match.index + match[0].length, 'thm-4.7', match[0])
  }

  const bareTheorem = /по теореме(?!\s*\d)|применя(?:ем|я)\s+теорему(?!\s*\d)/gi
  for (const match of text.matchAll(bareTheorem)) {
    if (match.index == null) continue
    const id = previousOfKind(contextId, 'theorem')
    if (!id) continue
    push(hits, contextId, match.index, match.index + match[0].length, id, match[0])
  }

  hits.sort((left, right) => left.start - right.start || right.end - left.end)
  const taken: Citation[] = []
  let cursor = 0
  for (const hit of hits) {
    if (hit.start < cursor) continue
    taken.push(hit)
    cursor = hit.end
  }
  return taken
}
