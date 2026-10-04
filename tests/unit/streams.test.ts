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

  it('оставляет Иванову компактность, а Редкозубову только открытые и замкнутые', () => {
    const topology = QUESTIONS.find((question) => question.number === 15)
    assert.ok(topology)
    const ivanov = visibleItems(topology, 'Г.Е. Иванов').map((item) => item.statementId)
    const redkozubov = visibleItems(topology, 'В.В. Редкозубов').map((item) => item.statementId)
    assert.ok(ivanov.includes('thm-3.2'))
    assert.equal(redkozubov.includes('thm-3.2'), false)
    assert.ok(redkozubov.includes('def-3-2'))
    assert.equal(visibleItems(topology, 'other').length, 0)
  })
})
