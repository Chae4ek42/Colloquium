import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { QUESTIONS } from '../../src/data/math/bank.ts'
import { visibleItems } from '../../src/features/math/streams.ts'

describe('фильтр вопросов по потоку', () => {
  it('показывает Дымарскому отделимость и скрывает её у другого потока', () => {
    const separation = QUESTIONS.find((question) => question.number === 3)
    assert.ok(separation)
    assert.equal(visibleItems(separation, 'Я.М. Дымарский').length, 2)
    assert.equal(visibleItems(separation, 'other').length, 0)
    assert.equal(visibleItems(separation, 'Г.Е. Иванов').length, 0)
  })

  it('убирает бесконечно малые у обоих Редкозубовых', () => {
    const infinitesimals = QUESTIONS.find((question) => question.number === 5)
    assert.ok(infinitesimals)
    assert.equal(visibleItems(infinitesimals, 'В.В. Редкозубов').length, 0)
    assert.equal(visibleItems(infinitesimals, 'Е.Ю. Редкозубова').length, 0)
    assert.ok(visibleItems(infinitesimals, 'other').length > 0)
  })

  it('показывает Иванову и Редкозубову открытые, замкнутые и критерий компактности', () => {
    const topology = QUESTIONS.find((question) => question.number === 15)
    assert.ok(topology)
    const ivanov = visibleItems(topology, 'Г.Е. Иванов').map((item) => item.statementId)
    const redkozubov = visibleItems(topology, 'В.В. Редкозубов').map((item) => item.statementId)
    for (const id of ['def-3-2', 'def-3-3', 'thm-3.1', 'def-3-5', 'thm-3.2', 'cor-3-2']) {
      assert.ok(ivanov.includes(id), id)
      assert.ok(redkozubov.includes(id), id)
    }
    assert.equal(visibleItems(topology, 'other').length, 0)
    assert.equal(visibleItems(topology, 'Е.Ю. Редкозубова').length, 0)
  })

  it('билет Редкозубова содержит положения, из которых состоит ответ', () => {
    const ids = (number: number) => {
      const question = QUESTIONS.find((item) => item.number === number)
      assert.ok(question)
      return visibleItems(question, 'В.В. Редкозубов').map((item) => item.statementId)
    }
    assert.ok(ids(2).includes('ax-1-2'))
    assert.ok(ids(16).includes('def-3-3'))
    assert.ok(ids(18).includes('def-4.4-2') && ids(18).includes('cor-4.4-1'))
    assert.ok(ids(19).includes('rem-4.5-1') && ids(19).includes('thm-4.4'))
    assert.ok(ids(21).includes('lem-4.2'))
    assert.ok(ids(22).includes('lem-4.3'))
    assert.ok(ids(23).includes('cor-4.6-1') && ids(23).includes('lem-4.4'))
  })
})
