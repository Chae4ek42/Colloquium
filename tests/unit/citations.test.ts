import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findCitations } from '../../src/features/math/citations.ts'
import { followsFrom, leadsTo, usedIn } from '../../src/features/math/relations.ts'

describe('ссылки на положения', () => {
  it('делает номер теоремы ссылкой', () => {
    const hits = findCitations('По теореме 1.5 существует c = sup A.', 'thm-1.6')
    assert.equal(hits[0]?.id, 'thm-1.5')
    assert.match(hits[0]?.note ?? '', /точная верхняя грань/)
  })

  it('склеивает имя Больцано — Вейерштрасс с номером', () => {
    const hits = findCitations('По теореме 2.9 Больцано — Вейерштрасса последовательность имеет подпоследовательность.', 'lem-4.2')
    assert.equal(hits.length, 1)
    assert.equal(hits[0]?.id, 'thm-2.9')
    assert.match(hits[0]?.phrase ?? '', /Вейерштрасса/)
  })

  it('не ссылается положение само на себя', () => {
    const hits = findCitations('По теореме 2.4 последовательность зажата.', 'thm-2.4')
    assert.equal(hits.length, 0)
  })

  it('безымянную «по теореме» перед формулой относит к предыдущей теореме', () => {
    const hits = findCitations('поэтому по теореме $n\\leqslant m$', 'cor-1')
    assert.equal(hits[0]?.id, 'thm-1.3')
  })

  it('плотность рациональных опирается на архимедово следствие и целую часть', () => {
    const prior = followsFrom('cor-3').map((item) => item.id)
    assert.ok(prior.includes('cor-1-2'))
    assert.ok(prior.includes('cor-2-2'))
    assert.ok(leadsTo('cor-3').some((item) => item.id === 'thm-4.6'))
    assert.ok(usedIn('cor-3').some((item) => item.id === 'ex-4.5-3'))
  })
})
