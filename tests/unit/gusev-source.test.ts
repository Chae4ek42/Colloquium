import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { QUESTIONS, activeSource, getStatement, selectSource } from '../../src/data/math/bank.ts'
import { splitParts } from '../../src/features/math/present.ts'

describe('конспект Гусева', () => {
  it('подключается отдельно и не подменяет пособие', () => {
    const previous = activeSource().id
    try {
      selectSource('gusev-2026')
      assert.equal(activeSource().title, 'Гусев Н.А.')
      assert.equal(QUESTIONS.length, 23)
      assert.equal(QUESTIONS.find((question) => question.number === 1)?.title.startsWith('Счетность'), true)
      assert.equal(QUESTIONS.find((question) => question.number === 15)?.items.length, 0)
      assert.ok(getStatement('thm-6.3-15'))
      assert.equal(getStatement('thm-2.9'), null)
      const fundamental = getStatement('def-9.1-5')
      assert.ok(fundamental)
      assert.equal(splitParts(fundamental).latex, true)

      selectSource('f1-lectures')
      assert.ok(getStatement('thm-2.9'))
      assert.equal(getStatement('thm-6.3-15'), null)
    } finally {
      selectSource(previous)
    }
  })
})
