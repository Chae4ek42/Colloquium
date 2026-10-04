import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pickWeighted } from '../../src/features/math/drill.ts'
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
})
