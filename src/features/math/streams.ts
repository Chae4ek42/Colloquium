import type { ExamItem, ExamQuestion, StreamMark } from '../../data/math/types'

/** Потоки, названные в листе. «Другой» — все остальные. */
export const NAMED_STREAMS = [
  'Н.А. Гусев',
  'Я.М. Дымарский',
  'Л.Н. Знаменская',
  'Г.Е. Иванов',
  'В.В. Редкозубов',
  'Е.Ю. Редкозубова',
  'А.А. Скубачевский',
] as const

export type NamedStream = (typeof NAMED_STREAMS)[number]
export type StreamFilter = 'all' | 'other' | NamedStream

export const STREAM_FILTERS: Array<{ id: StreamFilter; label: string }> = [
  { id: 'all', label: 'Все вопросы' },
  ...NAMED_STREAMS.map((name) => ({ id: name, label: name })),
  { id: 'other', label: 'Другой' },
]

export function streamMatches(mark: StreamMark | undefined, stream: StreamFilter): boolean {
  if (stream === 'all' || !mark) return true
  if (stream === 'other') {
    if (mark.only?.length) return false
    return true
  }
  if (mark.only?.length) return mark.only.includes(stream)
  if (mark.except?.length) return !mark.except.includes(stream)
  return true
}

export function visibleItems(question: ExamQuestion, stream: StreamFilter): ExamItem[] {
  if (!streamMatches(question.streams, stream)) return []
  return question.items.filter((item) => streamMatches(item.streams, stream))
}
