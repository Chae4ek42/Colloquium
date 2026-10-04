import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getStatement } from '../../src/data/math/bank.ts'
import { splitParts } from '../../src/features/math/present.ts'

describe('разделение формулировки и доказательства', () => {
  it('оставляет утверждение теоремы 2.10 формулировкой', () => {
    const statement = getStatement('thm-2.10')
    assert.ok(statement)
    const parts = splitParts(statement)
    assert.match(parts.formulation, /Верхний \(нижний\) предел/)
    assert.doesNotMatch(parts.formulation, /^Доказательство/)
    assert.match(parts.proof ?? '', /^Доказательство/)
  })

  it('не прячет формулировку теоремы 2.15 в доказательство', () => {
    const statement = getStatement('thm-2.15')
    assert.ok(statement)
    const parts = splitParts(statement)
    assert.match(parts.formulation, /счетно/)
    assert.doesNotMatch(parts.formulation, /^Доказательство/)
    assert.match(parts.proof ?? '', /g\(p\)/)
  })

  it('снимает заголовок теоремы 2.6 и оставляет пункты формулировки', () => {
    const statement = getStatement('thm-2.6')
    assert.ok(statement)
    const parts = splitParts(statement)
    assert.match(parts.formulation, /^1\)/)
    assert.match(parts.proof ?? '', /^Доказательство/)
  })
})
