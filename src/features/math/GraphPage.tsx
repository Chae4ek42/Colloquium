import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { KIND_LABEL, STATEMENTS, getStatement, type Statement } from '../../data/math/bank'
import { displayName } from './present'
import { searchStatements } from './search'
import { StatementLink, useMathUi } from './ui'
import './graph.css'

const NODE_W = 210
const NODE_H = 68
const GAP_X = 28
const GAP_Y = 40
const DUMMY_W = 14
const LINE_LIMIT = 26
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

const KIND_SHORT: Record<Statement['kind'], string> = {
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

interface Edge {
  from: string
  to: string
}

interface GraphIndex {
  startId: string
  incoming: Map<string, string[]>
  outgoing: Map<string, string[]>
  edges: Edge[]
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Chain {
  from: string
  to: string
  vias: string[]
  outX: number
  inX: number
}

interface Point {
  x: number
  y: number
}

interface PlacedNode {
  id: string
  x: number
  y: number
  badge: string
  line1: string
  line2: string
  title: string
}

interface PlacedEdge {
  key: string
  d: string
}

interface Layout {
  nodes: PlacedNode[]
  edges: PlacedEdge[]
  width: number
  height: number
}

interface View {
  x: number
  y: number
  k: number
}

const GRAPH = buildGraph()

export function GraphPage() {
  const ui = useMathUi()
  const [focusId, setFocusId] = useState(GRAPH.startId)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>({ x: 24, y: 24, k: 1 })
  const [panning, setPanning] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  viewRef.current = view

  const layout = useMemo(() => buildLayout(focusId), [focusId])
  const focus = getStatement(focusId)
  const contents = useMemo(() => buildContents(query, focusId), [query, focusId])

  useEffect(() => {
    document.title = 'Граф развития — Коллоквиум'
  }, [])

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || layout.nodes.length === 0) return
    const apply = () => {
      if (svg.clientWidth < 20 || svg.clientHeight < 20) return
      setView(fitView(svg.clientWidth, svg.clientHeight, layout.width, layout.height))
    }
    apply()
    const frame = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(frame)
  }, [layout])

  useEffect(() => {
    const stage = stageRef.current
    const svg = svgRef.current
    if (!stage || !svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = svg.getBoundingClientRect()
      const mx = event.clientX - rect.left
      const my = event.clientY - rect.top
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const factor = Math.exp(-delta * 0.0015)
      setView((prev) => zoomAt(prev, mx, my, factor))
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  function fit() {
    const svg = svgRef.current
    if (!svg || layout.nodes.length === 0) return
    setView(fitView(svg.clientWidth, svg.clientHeight, layout.width, layout.height))
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    if ((event.target as Element).closest('.math-graph-node')) return
    const current = viewRef.current
    dragRef.current = { px: event.clientX, py: event.clientY, x: current.x, y: current.y }
    setPanning(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag) return
    setView({
      x: drag.x + (event.clientX - drag.px),
      y: drag.y + (event.clientY - drag.py),
      k: viewRef.current.k,
    })
  }

  function endPan(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return
    dragRef.current = null
    setPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <main className="math-graph-page">
      <header className="math-graph-head">
        <h1>Граф развития</h1>
        <p className="math-graph-lead">
          Стрелка идёт от уже нужного к тому, что из него получается. Справа — содержание этой окрестности.
        </p>
      </header>
      <div className="math-graph-layout">
        <div className="math-graph-stage" ref={stageRef}>
          {layout.nodes.length > 0 ? (
            <>
              <div className="math-graph-tools">
                <p className="math-graph-count">
                  {ruCount(layout.nodes.length, ['узел', 'узла', 'узлов'])}
                  {' · '}
                  {ruCount(layout.edges.length, ['ребро', 'ребра', 'рёбер'])}
                </p>
                <button type="button" className="math-graph-fit" onClick={fit}>
                  Вписать
                </button>
              </div>
              <svg
                ref={svgRef}
                className={panning ? 'math-graph-svg is-panning' : 'math-graph-svg'}
                role="group"
                aria-label="Граф развития выбранного положения"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPan}
                onPointerCancel={endPan}
              >
                <defs>
                  <marker
                    id="math-graph-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 Z" fill="#111" />
                  </marker>
                </defs>
                <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                  {layout.edges.map((edge) => (
                    <path key={edge.key} className="math-graph-edge" d={edge.d} markerEnd="url(#math-graph-arrow)" />
                  ))}
                  {layout.nodes.map((node) => {
                    const current = node.id === focusId
                    const clipId = `math-graph-clip-${node.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
                    return (
                      <g
                        key={node.id}
                        className={current ? 'math-graph-node is-current' : 'math-graph-node'}
                        transform={`translate(${node.x} ${node.y})`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={current}
                        aria-label={node.title}
                        onClick={(event) => {
                          event.stopPropagation()
                          setFocusId(node.id)
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          ui.openStatement(node.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          event.preventDefault()
                          if (node.id === focusId) ui.openStatement(node.id)
                          else setFocusId(node.id)
                        }}
                      >
                        <title>{node.title}</title>
                        <rect width={NODE_W} height={NODE_H} rx="16" />
                        <clipPath id={clipId}>
                          <rect x="10" y="2" width={NODE_W - 20} height={NODE_H - 4} />
                        </clipPath>
                        <text className="math-graph-badge" x="12" y="20" clipPath={`url(#${clipId})`}>
                          {node.badge}
                        </text>
                        <text className="math-graph-label" x="12" y={node.line2 ? 40 : 46} clipPath={`url(#${clipId})`}>
                          {node.line1}
                        </text>
                        {node.line2 ? (
                          <text className="math-graph-label" x="12" y="58" clipPath={`url(#${clipId})`}>
                            {node.line2}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </>
          ) : (
            <p className="math-graph-empty">Такого положения нет.</p>
          )}
        </div>
        <aside className="math-graph-side">
          <label className="math-graph-search">
            Найти
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Номер или слова из названия"
              type="search"
              autoComplete="off"
            />
          </label>
          {focus ? (
            <p className="math-graph-focus-line">
              <span>{displayName(focus)}</span>
              <StatementLink id={focus.id} className="math-graph-open">
                Открыть
              </StatementLink>
            </p>
          ) : null}
          <nav className="math-graph-toc" aria-label="Содержание">
            {contents.length === 0 ? (
              <p className="math-graph-quiet">Ничего не нашлось.</p>
            ) : (
              contents.map((group) => (
                <section key={group.key} className="math-graph-toc-group">
                  <h2>{sectionHeading(group)}</h2>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id} className={item.id === focusId ? 'is-current' : undefined}>
                        <StatementLink id={item.id}>{tocLabel(item)}</StatementLink>
                        <button type="button" onClick={() => setFocusId(item.id)}>
                          На схеме
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </nav>
        </aside>
      </div>
    </main>
  )
}

function buildGraph(): GraphIndex {
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  const edges: Edge[] = []
  for (const item of STATEMENTS) {
    for (const prior of item.dependsOn) {
      edges.push({ from: prior, to: item.id })
      pushMap(outgoing, prior, item.id)
      pushMap(incoming, item.id, prior)
    }
  }
  let startId = getStatement('thm-2.11') ? 'thm-2.11' : (STATEMENTS.find((item) => item.kind === 'theorem')?.id ?? STATEMENTS[0]?.id ?? '')
  let bestScore = -1
  let bestOut = -1
  for (const item of STATEMENTS) {
    if (item.kind !== 'theorem') continue
    const inn = incoming.get(item.id)?.length ?? 0
    const out = outgoing.get(item.id)?.length ?? 0
    const score = inn + out
    if (score > bestScore || (score === bestScore && out > bestOut)) {
      bestScore = score
      bestOut = out
      startId = item.id
    }
  }
  return { startId, incoming, outgoing, edges }
}

function neighborhood(focusId: string): { ids: string[]; edges: Edge[] } {
  if (!getStatement(focusId)) return { ids: [], edges: [] }
  const ids = new Set<string>([focusId])
  const up = [focusId]
  const seenUp = new Set<string>([focusId])
  while (up.length > 0) {
    const current = up.pop()
    if (!current) break
    for (const prior of GRAPH.incoming.get(current) ?? []) {
      if (seenUp.has(prior)) continue
      seenUp.add(prior)
      ids.add(prior)
      up.push(prior)
    }
  }
  const down = [focusId]
  const seenDown = new Set<string>([focusId])
  while (down.length > 0) {
    const current = down.pop()
    if (!current) break
    for (const next of GRAPH.outgoing.get(current) ?? []) {
      if (seenDown.has(next)) continue
      seenDown.add(next)
      ids.add(next)
      down.push(next)
    }
  }
  return {
    ids: [...ids],
    edges: GRAPH.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
  }
}

/** Слои — длина самого длинного пути от истоков. Длинные рёбра проходят через узкие пустые места, чтобы не резать подписи. */
function buildLayout(focusId: string): Layout {
  const hood = neighborhood(focusId)
  if (hood.ids.length === 0) return { nodes: [], edges: [], width: 0, height: 0 }
  const rank = assignRanks(hood.ids, hood.edges)
  const chains: Chain[] = []
  const dummyRank = new Map<string, number>()
  hood.edges.forEach((edge, index) => {
    const fromRank = rank.get(edge.from) ?? 0
    const toRank = rank.get(edge.to) ?? 0
    const span = toRank - fromRank
    const vias: string[] = []
    if (span > 1) {
      for (let step = 1; step < span; step += 1) {
        const via = `~${index}-${step}`
        vias.push(via)
        dummyRank.set(via, fromRank + step)
      }
    }
    chains.push({ from: edge.from, to: edge.to, vias, outX: 0, inX: 0 })
  })

  const preds = new Map<string, string[]>()
  const succs = new Map<string, string[]>()
  for (const chain of chains) {
    const seq = [chain.from, ...chain.vias, chain.to]
    for (let index = 0; index < seq.length - 1; index += 1) {
      const from = seq[index]
      const to = seq[index + 1]
      if (!from || !to) continue
      pushMap(succs, from, to)
      pushMap(preds, to, from)
    }
  }

  const maxRank = Math.max(...hood.ids.map((id) => rank.get(id) ?? 0))
  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => [])
  for (const id of hood.ids) layers[rank.get(id) ?? 0]?.push(id)
  for (const [id, layer] of dummyRank) layers[layer]?.push(id)
  for (const layer of layers) {
    const reals = layer.filter((id) => !id.startsWith('~')).sort(compareNodes)
    const dummies = layer.filter((id) => id.startsWith('~'))
    layer.splice(0, layer.length, ...reals, ...dummies)
  }
  orderLayers(layers, preds, succs)

  const positions = placeLayers(layers)
  assignPorts(chains, positions)
  const width = Math.max(...layers.map((layer) => rowWidth(layer)), NODE_W)
  const height = layers.length * NODE_H + Math.max(0, layers.length - 1) * GAP_Y

  return {
    width,
    height,
    nodes: hood.ids.map((id) => {
      const box = positions.get(id)
      const text = nodeText(id)
      return {
        id,
        x: box?.x ?? 0,
        y: box?.y ?? 0,
        badge: text.badge,
        line1: text.line1,
        line2: text.line2,
        title: text.title,
      }
    }),
    edges: chains.map((chain, index) => ({
      key: `${chain.from}->${chain.to}:${index}`,
      d: chain.vias.length === 0 && (rank.get(chain.to) ?? 0) <= (rank.get(chain.from) ?? 0)
        ? backwardPath(chain, positions)
        : forwardPath(chain, positions),
    })),
  }
}

function assignRanks(ids: string[], edges: Edge[]): Map<string, number> {
  const preds = new Map<string, string[]>()
  for (const id of ids) preds.set(id, [])
  for (const edge of edges) {
    if (!preds.has(edge.to) || !preds.has(edge.from)) continue
    pushMap(preds, edge.to, edge.from)
  }
  const rank = new Map<string, number>()
  const visiting = new Set<string>()
  const visit = (id: string): number => {
    const known = rank.get(id)
    if (known !== undefined) return known
    if (visiting.has(id)) return 0
    visiting.add(id)
    let value = 0
    for (const prior of preds.get(id) ?? []) value = Math.max(value, visit(prior) + 1)
    visiting.delete(id)
    rank.set(id, value)
    return value
  }
  for (const id of ids) visit(id)
  return rank
}

function orderLayers(layers: string[][], preds: Map<string, string[]>, succs: Map<string, string[]>) {
  const indexOf = () => {
    const map = new Map<string, number>()
    for (const layer of layers) layer.forEach((id, index) => map.set(id, index))
    return map
  }
  const bary = (neighbors: string[], pos: Map<string, number>, fallback: number) => {
    const values = neighbors.map((item) => pos.get(item)).filter((item): item is number => item !== undefined)
    if (values.length === 0) return fallback
    return values.reduce((sum, item) => sum + item, 0) / values.length
  }
  for (let pass = 0; pass < 5; pass += 1) {
    let pos = indexOf()
    for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
      const layer = layers[layerIndex]
      if (!layer) continue
      const current = new Map(layer.map((id, index) => [id, index]))
      layer.sort((a, b) => {
        const delta = bary(preds.get(a) ?? [], pos, current.get(a) ?? 0) - bary(preds.get(b) ?? [], pos, current.get(b) ?? 0)
        return delta || (current.get(a) ?? 0) - (current.get(b) ?? 0)
      })
    }
    pos = indexOf()
    for (let layerIndex = layers.length - 2; layerIndex >= 0; layerIndex -= 1) {
      const layer = layers[layerIndex]
      if (!layer) continue
      const current = new Map(layer.map((id, index) => [id, index]))
      layer.sort((a, b) => {
        const delta = bary(succs.get(a) ?? [], pos, current.get(a) ?? 0) - bary(succs.get(b) ?? [], pos, current.get(b) ?? 0)
        return delta || (current.get(a) ?? 0) - (current.get(b) ?? 0)
      })
    }
  }
}

function placeLayers(layers: string[][]): Map<string, Box> {
  const positions = new Map<string, Box>()
  const width = Math.max(...layers.map((layer) => rowWidth(layer)), NODE_W)
  layers.forEach((layer, layerIndex) => {
    let x = (width - rowWidth(layer)) / 2
    const y = layerIndex * (NODE_H + GAP_Y)
    for (const id of layer) {
      const w = id.startsWith('~') ? DUMMY_W : NODE_W
      positions.set(id, { x, y, w, h: NODE_H })
      x += w + GAP_X
    }
  })
  return positions
}

function rowWidth(layer: string[]): number {
  if (layer.length === 0) return 0
  const boxes = layer.reduce((sum, id) => sum + (id.startsWith('~') ? DUMMY_W : NODE_W), 0)
  return boxes + GAP_X * (layer.length - 1)
}

function assignPorts(chains: Chain[], positions: Map<string, Box>) {
  const bySource = new Map<string, Chain[]>()
  const byTarget = new Map<string, Chain[]>()
  for (const chain of chains) {
    pushMap(bySource, chain.from, chain)
    pushMap(byTarget, chain.to, chain)
  }
  for (const [id, list] of bySource) {
    const box = positions.get(id)
    if (!box || id.startsWith('~')) continue
    list.sort((a, b) => centerX(positions, a.vias[0] ?? a.to) - centerX(positions, b.vias[0] ?? b.to))
    list.forEach((chain, index) => {
      chain.outX = portX(box, index, list.length)
    })
  }
  for (const [id, list] of byTarget) {
    const box = positions.get(id)
    if (!box || id.startsWith('~')) continue
    list.sort((a, b) => centerX(positions, a.vias[a.vias.length - 1] ?? a.from) - centerX(positions, b.vias[b.vias.length - 1] ?? b.from))
    list.forEach((chain, index) => {
      chain.inX = portX(box, index, list.length)
    })
  }
}

function portX(box: Box, index: number, count: number): number {
  const pad = 18
  const span = box.w - pad * 2
  if (count <= 1) return box.x + box.w / 2
  return box.x + pad + (span * index) / (count - 1)
}

function centerX(positions: Map<string, Box>, id: string): number {
  const box = positions.get(id)
  if (!box) return 0
  return box.x + box.w / 2
}

function forwardPath(chain: Chain, positions: Map<string, Box>): string {
  const seq = [chain.from, ...chain.vias, chain.to]
  const points: Point[] = []
  seq.forEach((id, index) => {
    const box = positions.get(id)
    if (!box) return
    const last = index === seq.length - 1
    if (index === 0) {
      points.push({ x: chain.outX, y: box.y + box.h })
      return
    }
    if (last) {
      points.push({ x: chain.inX, y: box.y })
      return
    }
    const x = box.x + box.w / 2
    points.push({ x, y: box.y })
    points.push({ x, y: box.y + box.h })
  })
  return pathFrom(points)
}

function backwardPath(chain: Chain, positions: Map<string, Box>): string {
  const from = positions.get(chain.from)
  const to = positions.get(chain.to)
  if (!from || !to) return ''
  const x1 = from.x + from.w / 2
  const y1 = from.y + from.h
  const x2 = to.x + to.w / 2
  const y2 = to.y
  const side = Math.max(from.x + from.w, to.x + to.w) + 36
  return `M ${x1} ${y1} C ${side} ${y1 + 28}, ${side} ${y2 - 28}, ${x2} ${y2}`
}

function pathFrom(points: Point[]): string {
  const first = points[0]
  if (!first) return ''
  let d = `M ${round(first.x)} ${round(first.y)}`
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    if (!from || !to) continue
    if (Math.abs(from.x - to.x) < 0.8) {
      d += ` L ${round(to.x)} ${round(to.y)}`
      continue
    }
    const dy = Math.max(18, (to.y - from.y) * 0.46)
    d += ` C ${round(from.x)} ${round(from.y + dy)}, ${round(to.x)} ${round(to.y - dy)}, ${round(to.x)} ${round(to.y)}`
  }
  return d
}

function nodeText(id: string): { badge: string; line1: string; line2: string; title: string } {
  const statement = getStatement(id)
  if (!statement) return { badge: id, line1: id, line2: '', title: id }
  const [line1, line2] = titleLines(statement)
  return { badge: badgeOf(statement), line1, line2, title: statement.title }
}

function badgeOf(statement: Statement): string {
  return statement.number ?? KIND_SHORT[statement.kind]
}

function titleLines(statement: Statement): [string, string] {
  let text = statement.title.replace(/\s+/g, ' ').trim()
  text = text.replace(/^(Теорема|Лемма|Следствие|Определение|Пример|Замечание|Задача|Аксиома|Принцип)\s*/u, '')
  text = text.replace(/^\d+(?:\.\d+)*\.?\s*/, '')
  text = text.replace(/^[.\s]+/, '')
  if (!text) text = displayName(statement)
  return wrap(text, LINE_LIMIT)
}

function sectionHeading(group: ContentGroup): string {
  const title = group.sectionTitle.replace(/\s+/g, ' ').trim()
  const short = title.length > 42 ? `${title.slice(0, 40).trimEnd()}…` : title
  return short ? `${group.sectionId}. ${short}` : group.sectionId
}

function tocLabel(statement: Statement): string {
  const name = displayName(statement)
  const kind = KIND_LABEL[statement.kind]
  if (statement.number || name.length > kind.length + 3) return name
  const [line] = titleLines(statement)
  return line && line !== kind ? `${name}. ${line}` : name
}

interface ContentGroup {
  key: string
  sectionId: string
  sectionTitle: string
  page: number
  items: Statement[]
}

function buildContents(query: string, focusId: string): ContentGroup[] {
  const pool = STATEMENTS.filter(
    (item) => item.kind !== 'prose' && item.kind !== 'exercise' && item.kind !== 'example',
  )
  const visible = new Set(neighborhood(focusId).ids)
  const found = query.trim() ? searchStatements(query, pool, 40) : pool.filter((item) => visible.has(item.id))
  const groups = new Map<string, ContentGroup>()
  for (const item of found) {
    const key = `${item.sectionId}|${item.sectionTitle}`
    const group = groups.get(key) ?? {
      key,
      sectionId: item.sectionId,
      sectionTitle: item.sectionTitle,
      page: item.bookPage,
      items: [],
    }
    group.page = Math.min(group.page, item.bookPage)
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()].sort(
    (left, right) => left.page - right.page || left.sectionId.localeCompare(right.sectionId, 'ru'),
  )
}

function wrap(text: string, max: number): [string, string] {
  if (text.length <= max) return [text, '']
  const space = text.lastIndexOf(' ', max)
  const cut = space >= 12 ? space : max
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

function compareNodes(a: string, b: string): number {
  const left = getStatement(a)
  const right = getStatement(b)
  const page = (left?.bookPage ?? 0) - (right?.bookPage ?? 0)
  if (page) return page
  const number = (left?.number ?? '').localeCompare(right?.number ?? '', 'ru', { numeric: true })
  if (number) return number
  return (left?.title ?? a).localeCompare(right?.title ?? b, 'ru')
}

function pushMap<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function ruCount(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11 ? forms[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? forms[1] : forms[2]
  return `${n} ${word}`
}

function fitView(viewW: number, viewH: number, contentW: number, contentH: number): View {
  const pad = 36
  const availW = Math.max(1, viewW - pad * 2)
  const availH = Math.max(1, viewH - pad * 2)
  const k = Math.min(availW / Math.max(contentW, 1), availH / Math.max(contentH, 1), 1.25)
  return {
    k,
    x: (viewW - contentW * k) / 2,
    y: (viewH - contentH * k) / 2,
  }
}

function zoomAt(prev: View, mx: number, my: number, factor: number): View {
  const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev.k * factor))
  return {
    k,
    x: mx - ((mx - prev.x) / prev.k) * k,
    y: my - ((my - prev.y) / prev.k) * k,
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
