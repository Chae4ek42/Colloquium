import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STATEMENTS, type Statement } from '../../src/data/math/bank.ts'
import { normalizeMathQuery, scoreStatement, searchStatements } from '../../src/features/math/search.ts'

function statement(partial: Pick<Statement, 'id' | 'title'> & Partial<Statement>): Statement {
  return {
    kind: 'theorem',
    number: null,
    sectionId: '1',
    sectionTitle: '',
    bookPage: 1,
    bookPages: [1],
    text: '',
    mentions: [],
    dependsOn: [],
    formulation: null,
    latex: null,
    pageSrc: '',
    pageSrcs: [],
    ...partial,
  }
}

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

  it('находит команду из LaTeX слабее, чем название', () => {
    const titled = statement({ id: 'titled', title: 'Supset в заголовке' })
    const buried = statement({
      id: 'buried',
      title: 'Вложенные отрезки',
      latex: String.raw`[a_n,b_n]\supset[a_{n+1},b_{n+1}]`,
    })
    const found = searchStatements('supset', [buried, titled], 5)
    assert.deepEqual(
      found.map((item) => item.id),
      ['titled', 'buried'],
    )
    assert.ok(scoreStatement(titled, 'supset') > scoreStatement(buried, 'supset'))
  })

  it('находит supset в определении вложенных отрезков', () => {
    const found = searchStatements('supset', STATEMENTS, 20)
    assert.equal(found.some((item) => item.id === 'def-2.3-1'), true)
  })

  it('прощает пропущенную букву в длинном слове из текста', () => {
    const found = searchStatements('стягивающася', STATEMENTS, 8)
    assert.equal(
      found.some((item) => item.id === 'def-2.3-1' || item.id === 'thm-2.7'),
      true,
    )
  })
})
