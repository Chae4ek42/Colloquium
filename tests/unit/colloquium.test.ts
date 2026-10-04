import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEPENDS } from '../../src/data/math/depends.ts'
import { FORMULATIONS } from '../../src/data/math/formulations.ts'
import { EXAM_QUESTIONS, PROGRAM_NOTE } from '../../src/data/math/questions.ts'
import { STATEMENTS, getStatement } from '../../src/data/math/bank.ts'

const TITLES = [
  'Счетность множества рациональных чисел, несчетность множества действительных (вещественных) чисел.',
  'Теорема о существовании точной верхней (нижней) грани множества.',
  'Теорема об отделимости двух множеств действительных чисел (потоки Я.М. Дымарского и Л.Н. Знаменской).',
  'Единственность предела сходящейся последовательности. Ограниченность сходящейся последовательности.',
  'Бесконечно малые последовательности и их свойства (кроме потоков В.В. Редкозубова и Е.Ю. Редкозубовой).',
  'Арифметические операции со сходящимися последовательностями.',
  'Свойства пределов, связанные с неравенствами.',
  'Теорема о пределе ограниченной монотонной последовательности.',
  'Теорема Кантора о вложенных отрезках.',
  'Подпоследовательности и частичные пределы. Критерий частичного предела.',
  'Верхний и нижний пределы числовой последовательности (кроме потоков Н.А. Гусева, Л.Н. Знаменской и А.А. Скубачевского).',
  'Теорема Больцано–Вейерштрасса.',
  'Теорема о единственном частичном пределе (кроме потоков В.В. Редкозубова, Е.Ю. Редкозубовой).',
  'Критерий Коши сходимости числовой последовательности.',
  'Открытые и замкнутые подмножества действительной прямой и их свойства (потоки Г.Е. Иванова и В.В. Редкозубова). Критерий компактности подмножества действительной прямой (поток Г.Е. Иванова).',
  'Определение предела функции в точке по Коши и по Гейне, их эквивалентность.',
  'Критерий Коши существования предела функции.',
  'Существование односторонних пределов у монотонных функций.',
  'Непрерывность функции в точке. Непрерывность сложной функции. Эквивалентные условия непрерывности (потоки В.В. Редкозубова и Е.Ю. Редкозубовой).',
  'Ограниченность функции, непрерывной на отрезке.',
  'Достижение точной верхней и точной нижней граней функции, непрерывной на отрезке.',
  'Теорема о промежуточных значениях непрерывной функции.',
  'Теорема об обратной функции (кроме потоков Н.А. Гусева, Л.Н. Знаменской и Е.Ю. Редкозубовой).',
]

function flat(text: string): string {
  return text.replace(/\s+/g, ' ')
}

describe('коллоквиум', () => {
  it('вопросы листа совпадают дословно и идут по номерам', () => {
    assert.equal(EXAM_QUESTIONS.length, 23)
    EXAM_QUESTIONS.forEach((question, index) => {
      assert.equal(question.number, index + 1)
      assert.equal(question.title, TITLES[index])
      assert.ok(question.items.length > 0)
    })
    assert.match(PROGRAM_NOTE, /пп\. 1–6 программы/)
  })

  it('каждый пункт вопроса есть в пособии и имеет отдельную формулировку', () => {
    for (const question of EXAM_QUESTIONS) {
      for (const item of question.items) {
        const statement = getStatement(item.statementId)
        assert.ok(statement, item.statementId)
        assert.equal(typeof FORMULATIONS[item.statementId], 'string')
        assert.ok((FORMULATIONS[item.statementId]?.length ?? 0) > 8, item.statementId)
      }
    }
  })

  it('ключевые формулировки взяты из текста пособия', () => {
    const anchors: Record<string, string> = {
      'thm-1.5': 'непустое ограниченное сверху (снизу) множество имеет точную верхнюю (нижнюю) грань',
      'ax-1-2': 'A лежит левее B, тогда существует c',
      'thm-2.1': 'о единственности',
      'thm-2.2': 'об ограниченности',
      'thm-2.5': 'арифметические операции с пределами',
      'thm-2.6': 'о пределе монотонной последовательности',
      'thm-2.7': 'последовательность вложенных отрезков имеет общую точку',
      'thm-2.9': 'ограниченная последовательность имеет сходящуюся подпоследовательность',
      'thm-2.11': 'сходится тогда и только тогда, когда она фундаментальна',
      'thm-2.16': 'Множество R несчетно',
      'cor-2.8-2': 'Множество Q счетно',
      'thm-4.1': 'по Коши и по Гейне равносильны',
      'thm-4.7': 'Вейерштрасс',
      'thm-4.8': 'промежуточных значениях',
      'thm-4.9': 'об обратной функции',
      'lem-4.2': 'ограничена на [a, b]',
    }
    for (const [id, phrase] of Object.entries(anchors)) {
      const statement = getStatement(id)
      assert.ok(statement, id)
      assert.ok(flat(statement.text).includes(phrase), `${id} text`)
      assert.ok(flat(FORMULATIONS[id] ?? '').length > 8, id)
    }
  })

  it('главы 1–4.7 целиком попали в базу', () => {
    const pages = new Set(STATEMENTS.flatMap((item) => item.bookPages ?? [item.bookPage]))
    for (let page = 6; page <= 73; page += 1) {
      assert.equal(pages.has(page), true, `нет страницы ${page}`)
    }
    assert.ok(STATEMENTS.length > 200)
    const kinds = new Set(STATEMENTS.map((item) => item.kind))
    for (const kind of ['definition', 'theorem', 'lemma', 'corollary', 'axiom', 'example', 'remark']) {
      assert.equal(kinds.has(kind as 'theorem'), true, kind)
    }
  })

  it('ссылки графа и упоминания ведут на существующие положения', () => {
    const ids = new Set(STATEMENTS.map((item) => item.id))
    for (const [id, priors] of Object.entries(DEPENDS)) {
      assert.equal(ids.has(id), true, id)
      for (const prior of priors) assert.equal(ids.has(prior), true, prior)
    }
    for (const statement of STATEMENTS) {
      for (const mention of statement.mentions) {
        assert.equal(ids.has(mention), true, `${statement.id} -> ${mention}`)
      }
    }
  })
})
