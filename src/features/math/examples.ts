import { STATEMENTS, activeSource, getStatement, type Statement } from '../../data/math/bank'
import type { StatementKind } from '../../data/math/types'

const ANCHOR: ReadonlySet<StatementKind> = new Set([
  'definition',
  'axiom',
  'principle',
  'theorem',
  'lemma',
  'corollary',
  'remark',
])

function previousAnchor(index: number): Statement | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const item = STATEMENTS[cursor]
    if (item && ANCHOR.has(item.kind)) return item
  }
  return null
}

function nextAnchor(index: number): Statement | null {
  for (let cursor = index + 1; cursor < STATEMENTS.length; cursor += 1) {
    const item = STATEMENTS[cursor]
    if (item && ANCHOR.has(item.kind)) return item
  }
  return null
}

function hostFor(example: Statement, index: number): Statement | null {
  const before = previousAnchor(index)
  const after = nextAnchor(index)
  if (before && before.sectionId === example.sectionId) return before
  if (after && after.sectionId === example.sectionId) return after
  return before ?? after
}

let attachedSource = ''
let attached = new Map<string, string[]>()

function exampleMap(): Map<string, string[]> {
  const sourceId = activeSource().id
  if (attachedSource === sourceId) return attached
  const next = new Map<string, string[]>()
  STATEMENTS.forEach((item, index) => {
    if (item.kind !== 'example') return
    const host = hostFor(item, index)
    if (!host) return
    const list = next.get(host.id) ?? []
    list.push(item.id)
    next.set(host.id, list)
  })
  attached = next
  attachedSource = sourceId
  return attached
}

export function examplesOf(id: string): Statement[] {
  return (exampleMap().get(id) ?? []).flatMap((exampleId) => {
    const example = getStatement(exampleId)
    return example ? [example] : []
  })
}
