import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { QUESTIONS, activeSource, getStatement, selectSource } from '../../src/data/math/bank.ts'

describe('конспект Гусева', () => {
  it('подключается отдельно и не подменяет пособие', () => {
    const previous = activeSource().id
    try {
      selectSource('gusev-2026')
      assert.equal(activeSource().title, 'Гусев Н.А.')
      assert.equal(activeSource().author, 'новый')
      assert.equal(QUESTIONS.length, 23)
      assert.equal(QUESTIONS.find((question) => question.number === 1)?.title.startsWith('Счетность'), true)
      assert.equal(QUESTIONS.find((question) => question.number === 15)?.items.length, 0)
      assert.ok(getStatement('thm-6.3-15'))
      assert.equal(getStatement('thm-2.9'), null)

      selectSource('f1-lectures')
      assert.ok(getStatement('thm-2.9'))
      assert.equal(getStatement('thm-6.3-15'), null)
    } finally {
      selectSource(previous)
    }
  })
})
