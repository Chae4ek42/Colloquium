import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pickOnce, pickWeighted } from '../../src/features/math/drill.ts'
import { recordAnswer, toggleLearned, type ProgressState } from '../../src/features/math/progress-model.ts'

describe('тренировка и отметки', () => {
  it('переключает выученное и не теряет остальные отметки', () => {
    const start: ProgressState = { learned: ['a'], stats: {} }
    const next = toggleLearned(start, 'b')
    assert.deepEqual(next.learned, ['a', 'b'])
    assert.deepEqual(toggleLearned(next, 'a').learned, ['b'])
  })

  it('считает ответы, не меняя список выученного', () => {
    const start: ProgressState = { learned: ['a'], stats: {} }
    const next = recordAnswer(start, 'card', false)
    assert.deepEqual(next.learned, ['a'])
    assert.deepEqual(next.stats.card, { shows: 1, known: 0, unknown: 1 })
  })

  it('адаптивный выбор чаще берёт карточку с ошибками', () => {
    const ids = ['easy', 'hard']
    const stats = {
      easy: { shows: 4, known: 4, unknown: 0 },
      hard: { shows: 4, known: 0, unknown: 4 },
    }
    let hard = 0
    for (let step = 0; step < 200; step += 1) {
      if (pickWeighted(ids, stats, 'adaptive', step / 200) === 'hard') hard += 1
    }
    assert.ok(hard > 120)
  })

  it('пустой пул ничего не выбирает', () => {
    assert.equal(pickWeighted([], {}, 'even', 0.2), null)
  })

  it('единожды не повторяет билет, пока круг не пройден', () => {
    const ids = ['a', 'b', 'c']
    let seen: string[] = []
    let current: string | null = null
    const shown: string[] = []
    for (let step = 0; step < ids.length; step += 1) {
      const next = pickOnce(ids, seen, current, {}, 0)
      assert.ok(next.id)
      assert.equal(shown.includes(next.id ?? ''), false)
      shown.push(next.id ?? '')
      seen = next.seen
      current = next.id
    }
    assert.deepEqual(shown, ['a', 'b', 'c'])
  })

  it('после полного круга билет можно показать снова, но не сразу тот же', () => {
    const next = pickOnce(['a', 'b', 'c'], ['a', 'b', 'c'], 'c', {}, 0)
    assert.equal(next.id, 'a')
    assert.deepEqual(next.seen, ['a'])
    const later = pickOnce(['a', 'b', 'c'], next.seen, next.id, {}, 0.99)
    assert.equal(later.id, 'c')
  })

  it('единственный билет после своего круга показывается снова', () => {
    const first = pickOnce(['a'], [], null, {}, 0)
    assert.equal(first.id, 'a')
    const second = pickOnce(['a'], first.seen, first.id, {}, 0)
    assert.equal(second.id, 'a')
    assert.deepEqual(second.seen, ['a'])
  })
})
