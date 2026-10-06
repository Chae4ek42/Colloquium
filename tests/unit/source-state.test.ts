import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LEGACY_PROGRESS_KEY,
  LEGACY_STREAM_KEY,
  progressStorageKey,
  readScopedRaw,
  streamStorageKey,
} from '../../src/data/math/source.ts'

function memory(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries))
  return { getItem: (key: string) => store.get(key) ?? null }
}

test('отметки выученного одного учебника не читаются в другом', () => {
  const lectures = progressStorageKey('f1-lectures')
  const other = progressStorageKey('other-book')
  assert.notEqual(lectures, other)

  const store = memory({
    [LEGACY_PROGRESS_KEY]: '{"learned":["thm-1.5"]}',
    [other]: '{"learned":["def-x"]}',
  })

  assert.equal(
    readScopedRaw(store, 'f1-lectures', lectures, LEGACY_PROGRESS_KEY, 'f1-lectures'),
    '{"learned":["thm-1.5"]}',
  )
  assert.equal(readScopedRaw(store, 'other-book', other, LEGACY_PROGRESS_KEY, 'f1-lectures'), '{"learned":["def-x"]}')

  const withoutOther = memory({ [LEGACY_PROGRESS_KEY]: '{"learned":["thm-1.5"]}' })
  assert.equal(readScopedRaw(withoutOther, 'other-book', other, LEGACY_PROGRESS_KEY, 'f1-lectures'), null)
})

test('свой ключ учебника важнее старого общего прогресса', () => {
  const lectures = progressStorageKey('f1-lectures')
  const store = memory({
    [LEGACY_PROGRESS_KEY]: '{"learned":["thm-1.5"]}',
    [lectures]: '{"learned":["q1"]}',
  })
  assert.equal(
    readScopedRaw(store, 'f1-lectures', lectures, LEGACY_PROGRESS_KEY, 'f1-lectures'),
    '{"learned":["q1"]}',
  )
})

test('поток тоже хранится отдельно для каждого учебника', () => {
  assert.notEqual(streamStorageKey('f1-lectures'), streamStorageKey('other-book'))
  const store = memory({ [LEGACY_STREAM_KEY]: 'other' })
  assert.equal(
    readScopedRaw(store, 'f1-lectures', streamStorageKey('f1-lectures'), LEGACY_STREAM_KEY, 'f1-lectures'),
    'other',
  )
  assert.equal(
    readScopedRaw(store, 'other-book', streamStorageKey('other-book'), LEGACY_STREAM_KEY, 'f1-lectures'),
    null,
  )
})
