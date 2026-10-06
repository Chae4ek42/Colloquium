import { KIND_LABEL, STATEMENTS, getStatement, shortName, type Statement } from '../../data/math/bank'
import type { StatementKind } from '../../data/math/types'
import { displayName } from './present'

export const NODE_W = 208
export const NODE_H = 62

const GAP_X = 16
const GAP_Y = 12
const BAND_WIDTH = 660
const BAND_GAP = 28
const LINE_LIMIT = 18

const KIND_SHORT: Record<StatementKind, string> = {
  definition: 'опр.',
  theorem: 'теор.',
  lemma: 'лем.',
  corollary: 'сл.',
  example: 'пр.',
  remark: 'зам.',
  exercise: 'зад.',
  axiom: 'акс.',
  principle: 'принц.',
  prose: 'текст',
}

export const KIND_COLOR: Record<StatementKind, string> = {
  definition: '#1b7a45',
  theorem: '#b42318',
  lemma: '#1d4f91',
  corollary: '#6d28d9',
  remark: '#c2410c',
  axiom: '#0f766e',
  principle: '#a16207',
  example: '#525252',
  exercise: '#525252',
  prose: '#444444',
}

interface Edge {
  from: string
  to: string
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface GraphNode {
  id: string
  kind: StatementKind
  x: number
  y: number
  badge: string
  line1: string
  line2: string
  title: string
}

export interface GraphEdge {
  key: string
  from: string
  to: string
  kind: StatementKind
  d: string
}

export interface GraphCaption {
  x: number
  y: number
  text: string
}

export interface CourseLayout {
  nodes: GraphNode[]
  edges: GraphEdge[]
  captions: GraphCaption[]
  width: number
  height: number
  startId: string
  incoming: Map<string, string[]>
  outgoing: Map<string, string[]>
}

/** Положения по главам сверху вниз, стрелки только по явным dependsOn. */
export function layoutCourse(): CourseLayout {
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  const edges: Edge[] = []
  const seen = new Set<string>()
  for (const item of STATEMENTS) {
    for (const prior of item.dependsOn) {
      if (prior === item.id || !getStatement(prior)) continue
      const key = `${prior}->${item.id}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: prior, to: item.id })
      pushMap(outgoing, prior, item.id)
      pushMap(incoming, item.id, prior)
    }
  }

  const ids = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))].sort(compareNodes)
  const bands = new Map<string, string[]>()
  for (const id of ids) {
    const key = chapterKey(getStatement(id)?.sectionId ?? '')
    const list = bands.get(key)
    if (list) list.push(id)
    else bands.set(key, [id])
  }
  const ordered = [...bands.entries()].sort((left, right) => compareNodes(left[1][0] ?? '', right[1][0] ?? ''))

  const positions = new Map<string, Box>()
  const captions: GraphCaption[] = []
  const cols = Math.max(1, Math.floor((BAND_WIDTH + GAP_X) / (NODE_W + GAP_X)))
  let cursor = 8
  for (const [, part] of ordered) {
    const items = part
      .map((id) => getStatement(id))
      .filter((item): item is Statement => item !== null)
    const caption = bandCaption(items)
    captions.push({ x: 0, y: cursor + 14, text: caption })
    cursor += 24
    for (let index = 0; index < part.length; index += cols) {
      const row = part.slice(index, index + cols)
      const rowWidth = row.length * NODE_W + Math.max(0, row.length - 1) * GAP_X
      let x = Math.max(0, (BAND_WIDTH - rowWidth) / 2)
      for (const id of row) {
        positions.set(id, { x, y: cursor, w: NODE_W, h: NODE_H })
        x += NODE_W + GAP_X
      }
      cursor += NODE_H + GAP_Y
    }
    cursor += BAND_GAP
  }

  const nodes = ids.map((id) => {
    const box = positions.get(id)
    const text = nodeText(id)
    return {
      id,
      kind: text.kind,
      x: box?.x ?? 0,
      y: box?.y ?? 0,
      badge: text.badge,
      line1: text.line1,
      line2: text.line2,
      title: text.title,
    }
  })

  const placed = edges.map((edge, index) => {
    const target = getStatement(edge.to)
    return {
      key: `${edge.from}->${edge.to}:${index}`,
      from: edge.from,
      to: edge.to,
      kind: target?.kind ?? 'theorem',
      d: edgePath(positions.get(edge.from), positions.get(edge.to), index),
    }
  })

  return {
    nodes,
    edges: placed,
    captions,
    width: BAND_WIDTH,
    height: Math.max(NODE_H, cursor - BAND_GAP),
    startId: pickStart(ids, incoming, outgoing),
    incoming,
    outgoing,
  }
}

export function chainOf(layout: CourseLayout, focusId: string): Set<string> {
  const ids = new Set<string>()
  if (!layout.outgoing.has(focusId) && !layout.incoming.has(focusId)) return ids
  const walk = (next: (id: string) => string[]) => {
    const stack = [focusId]
    const seen = new Set<string>()
    while (stack.length > 0) {
      const id = stack.pop()
      if (!id || seen.has(id)) continue
      seen.add(id)
      ids.add(id)
      for (const item of next(id)) stack.push(item)
    }
  }
  walk((id) => layout.incoming.get(id) ?? [])
  walk((id) => layout.outgoing.get(id) ?? [])
  return ids
}

function chapterKey(sectionId: string): string {
  return sectionId.match(/^\d+/)?.[0] ?? (sectionId || '0')
}

function bandCaption(items: Statement[]): string {
  const first = items[0]
  const last = items[items.length - 1]
  if (!first) return ''
  if (!last || first.sectionId === last.sectionId) return clip(`${first.sectionId}. ${first.sectionTitle}`, 52)
  const chapter = chapterKey(first.sectionId)
  return `Глава ${chapter}`
}

function pickStart(ids: string[], incoming: Map<string, string[]>, outgoing: Map<string, string[]>): string {
  let startId = ''
  let bestScore = -1
  let bestPage = Number.POSITIVE_INFINITY
  for (const id of ids) {
    const item = getStatement(id)
    if (!item || item.kind !== 'theorem') continue
    const score = (incoming.get(id)?.length ?? 0) + (outgoing.get(id)?.length ?? 0) * 2
    const page = item.bookPage
    if (score > bestScore || (score === bestScore && page < bestPage)) {
      bestScore = score
      bestPage = page
      startId = id
    }
  }
  if (startId) return startId
  return ids[0] ?? ''
}

function edgePath(from: Box | undefined, to: Box | undefined, index: number): string {
  if (!from || !to) return ''
  const shift = ((index % 5) - 2) * 7
  const x1 = from.x + from.w / 2 + shift
  const y1 = from.y + from.h
  const x2 = to.x + to.w / 2 + shift
  const y2 = to.y
  if (y2 >= y1 - 8) {
    const bend = Math.max(18, (y2 - y1) * 0.45)
    return `M ${round(x1)} ${round(y1)} C ${round(x1)} ${round(y1 + bend)}, ${round(x2)} ${round(y2 - bend)}, ${round(x2)} ${round(y2)}`
  }
  const side = Math.max(from.x + from.w, to.x + to.w) + 22
  return `M ${round(x1)} ${round(y1)} C ${round(side)} ${round(y1 + 16)}, ${round(side)} ${round(y2 - 16)}, ${round(x2)} ${round(y2)}`
}

function nodeText(id: string): { kind: StatementKind; badge: string; line1: string; line2: string; title: string } {
  const statement = getStatement(id)
  if (!statement) return { kind: 'theorem', badge: id, line1: id, line2: '', title: id }
  const head = statement.number ? `${KIND_SHORT[statement.kind]} ${statement.number}` : KIND_SHORT[statement.kind]
  const badge = clip(statement.sectionId ? `${statement.sectionId} · ${head}` : head, 30)
  const name = (shortName(statement.id) || statement.title || KIND_LABEL[statement.kind]).replace(/\s+/g, ' ').trim()
  const [line1, line2] = wrap(name, LINE_LIMIT)
  return { kind: statement.kind, badge, line1, line2, title: displayName(statement) }
}

function compareNodes(a: string, b: string): number {
  const left = getStatement(a)
  const right = getStatement(b)
  const page = (left?.bookPage ?? 0) - (right?.bookPage ?? 0)
  if (page) return page
  return (left?.title ?? a).localeCompare(right?.title ?? b, 'ru')
}

function wrap(text: string, max: number): [string, string] {
  if (text.length <= max) return [text, '']
  const space = text.lastIndexOf(' ', max)
  const cut = space >= 10 ? space : max
  const first = text.slice(0, cut).trim()
  const rest = text.slice(cut).trim()
  return [first, rest ? clip(rest, max) : '']
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max - 1)
  const word = slice.lastIndexOf(' ')
  const base = word > max * 0.55 ? slice.slice(0, word) : slice
  return `${base.trimEnd()}…`
}

function pushMap<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
