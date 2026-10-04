import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STATEMENTS } from '../../src/data/math/bank.ts'
import { normalizeMathQuery, searchStatements } from '../../src/features/math/search.ts'

describe('поиск положений', () => {
  it('нормализует ё и знаки', () => {
    assert.equal(normalizeMathQuery('  Ёлка, предел! '), 'елка предел')
  })

  it('находит теорему по номеру', () => {
    const found = searchStatements('2.11', STATEMENTS, 5)
    assert.equal(found[0]?.id, 'thm-2.11')
  })

  it('прощает опечатку в Больцано', () => {
    const found = searchStatements('болцано', STATEMENTS, 5)
    assert.equal(found.some((item) => item.id === 'thm-2.9'), true)
  })

  it('прощает опечатку в Вейерштрасс', () => {
    const found = searchStatements('вейрштрасс', STATEMENTS, 8)
    assert.equal(found.some((item) => item.id === 'thm-2.9' || item.id === 'thm-4.7'), true)
  })

  it('пустой запрос ничего не возвращает', () => {
    assert.deepEqual(searchStatements('   ', STATEMENTS), [])
  })
})
