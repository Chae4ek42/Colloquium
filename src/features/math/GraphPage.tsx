import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { STATEMENTS, getStatement, type Statement } from '../../data/math/bank'
import { KIND_COLOR, NODE_H, NODE_W, chainOf, layoutCourse, type GraphNode } from './graph-model'
import { displayName } from './present'
import { useProgress } from './progress'
import { searchStatements } from './search'
import { useMathSource } from './SourceContext'
import { LearnedButton, StatementLink, useMathUi } from './ui'
import './graph.css'

const ZOOM_MIN = 0.35
const ZOOM_MAX = 2.4

interface View {
  x: number
  y: number
  k: number
}

interface ContentGroup {
  key: string
  sectionId: string
  sectionTitle: string
  page: number
  items: Statement[]
}

export function GraphPage() {
  const ui = useMathUi()
  const { sourceId } = useMathSource()
  const progress = useProgress()
  const layout = useMemo(() => layoutCourse(), [sourceId])
  const [focusId, setFocusId] = useState(layout.startId)
  const [isolate, setIsolate] = useState(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>({ x: 24, y: 24, k: 1 })
  const [panning, setPanning] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  viewRef.current = view

  const onGraph = useMemo(() => new Set(layout.nodes.map((node) => node.id)), [layout])
  const chain = useMemo(() => (isolate ? chainOf(layout, focusId) : null), [isolate, focusId, layout])
  const contents = useMemo(() => buildContents(query, onGraph), [query, onGraph])
  const focus = getStatement(focusId)
  const learnedOnGraph = layout.nodes.filter((node) => progress.isLearned(node.id)).length
  const kinds = [...new Set(layout.nodes.map((node) => node.kind))]

  useEffect(() => {
    document.title = 'Граф — Коллоквиум'
  }, [])

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || layout.nodes.length === 0) return
    const apply = () => {
      if (svg.clientWidth < 20 || svg.clientHeight < 20) return
      setView(readableView(svg.clientWidth, layout.width))
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

  function zoomBy(factor: number) {
    const svg = svgRef.current
    if (!svg) return
    setView((prev) => zoomAt(prev, svg.clientWidth / 2, svg.clientHeight / 2, factor))
  }

  function showNode(id: string) {
    setFocusId(id)
    setIsolate(true)
    const svg = svgRef.current
    const node = layout.nodes.find((item) => item.id === id)
    if (!svg || !node) return
    const k = Math.max(viewRef.current.k, 0.9)
    setView({
      k,
      x: svg.clientWidth / 2 - (node.x + NODE_W / 2) * k,
      y: svg.clientHeight / 2 - (node.y + NODE_H / 2) * k,
    })
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
        <h1>Граф</h1>
        <p className="math-graph-lead">
          Стрелка идёт от основания к следствию. Цвет — вид положения, галочка — выучено.
        </p>
      </header>
      <div className="math-graph-layout">
        <div className="math-graph-stage" ref={stageRef}>
          {layout.nodes.length > 0 ? (
            <>
              <div className="math-graph-tools">
                <p className="math-graph-count">
                  {ruCount(layout.nodes.length, ['положение', 'положения', 'положений'])}
                  {' · '}
                  выучено {learnedOnGraph}
                </p>
                <div className="math-graph-tool-actions">
                  {isolate ? (
                    <button type="button" className="math-graph-fit" onClick={() => setIsolate(false)}>
                      Вся схема
                    </button>
                  ) : null}
                  <button type="button" className="math-graph-fit" onClick={() => zoomBy(1 / 1.2)} aria-label="Уменьшить">
                    −
                  </button>
                  <button type="button" className="math-graph-fit" onClick={() => zoomBy(1.2)} aria-label="Увеличить">
                    +
                  </button>
                  <button type="button" className="math-graph-fit" onClick={fit}>
                    Вписать
                  </button>
                </div>
              </div>
              <ul className="math-graph-legend">
                {kinds.map((kind) => (
                  <li key={kind} data-kind={kind}>
                    {legendLabel(kind)}
                  </li>
                ))}
                <li className="is-learned">выучено</li>
              </ul>
              <svg
                ref={svgRef}
                className={panning ? 'math-graph-svg is-panning' : 'math-graph-svg'}
                role="group"
                aria-label="Граф зависимостей учебника"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPan}
                onPointerCancel={endPan}
              >
                <defs>
                  <marker
                    id="math-graph-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto"
                  >
                    <path d="M 0 1.2 L 8 5 L 0 8.8 Z" fill="context-stroke" />
                  </marker>
                </defs>
                <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                  {layout.captions.map((caption, index) => (
                    <text key={`${caption.y}-${index}`} className="math-graph-caption" x={caption.x} y={caption.y}>
                      {caption.text}
                    </text>
                  ))}
                  {layout.edges.map((edge) => {
                    const dim = chain !== null && (!chain.has(edge.from) || !chain.has(edge.to))
                    return (
                      <path
                        key={edge.key}
                        className={dim ? 'math-graph-edge is-dim' : 'math-graph-edge'}
                        d={edge.d}
                        stroke={KIND_COLOR[edge.kind]}
                        markerEnd="url(#math-graph-arrow)"
                      />
                    )
                  })}
                  {layout.nodes.map((node) => (
                    <GraphNodeView
                      key={node.id}
                      node={node}
                      current={node.id === focusId}
                      learned={progress.isLearned(node.id)}
                      dim={chain !== null && !chain.has(node.id)}
                      onSelect={() => showNode(node.id)}
                      onOpen={() => ui.openStatement(node.id)}
                    />
                  ))}
                </g>
              </svg>
            </>
          ) : (
            <p className="math-graph-empty">В этом учебнике нет размеченных зависимостей.</p>
          )}
        </div>
        <aside className="math-graph-side">
          <label className="math-graph-search">
            Найти
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Номер, название или слова из текста"
              type="search"
              autoComplete="off"
            />
          </label>
          {focus ? (
            <div className="math-graph-focus-line">
              <span>{displayName(focus)}</span>
              <LearnedButton id={focus.id} />
              <StatementLink id={focus.id} className="math-graph-open">
                Открыть
              </StatementLink>
            </div>
          ) : null}
          <nav className="math-graph-toc" aria-label="Положения на схеме">
            {contents.length === 0 ? (
              <p className="math-graph-quiet">Ничего не нашлось.</p>
            ) : (
              contents.map((group) => {
                const learned = group.items.filter((item) => progress.isLearned(item.id)).length
                return (
                  <section key={group.key} className="math-graph-toc-group">
                    <h2>
                      {sectionHeading(group)}
                      <span>
                        {learned}/{group.items.length}
                      </span>
                    </h2>
                    <ul>
                      {group.items.map((item) => {
                        const linked = onGraph.has(item.id)
                        return (
                          <li
                            key={item.id}
                            className={item.id === focusId ? 'is-current' : undefined}
                            data-kind={item.kind}
                          >
                            <StatementLink id={item.id}>{displayName(item)}</StatementLink>
                            {progress.isLearned(item.id) ? (
                              <span className="math-graph-mini-check" aria-label="Выучено" />
                            ) : (
                              <span className="math-graph-mini-gap" />
                            )}
                            {linked ? (
                              <button type="button" onClick={() => showNode(item.id)}>
                                На схеме
                              </button>
                            ) : (
                              <span className="math-graph-off">вне схемы</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })
            )}
          </nav>
        </aside>
      </div>
    </main>
  )
}

function GraphNodeView({
  node,
  current,
  learned,
  dim,
  onSelect,
  onOpen,
}: {
  node: GraphNode
  current: boolean
  learned: boolean
  dim: boolean
  onSelect: () => void
  onOpen: () => void
}) {
  const clipId = `math-graph-clip-${node.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
  const classes = ['math-graph-node']
  if (current) classes.push('is-current')
  if (learned) classes.push('is-learned')
  if (dim) classes.push('is-dim')
  return (
    <g
      className={classes.join(' ')}
      data-kind={node.kind}
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex={0}
      aria-pressed={current}
      aria-label={learned ? `${node.title}, выучено` : node.title}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        onOpen()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (current) onOpen()
        else onSelect()
      }}
    >
      <title>{node.title}</title>
      {current ? <rect className="math-graph-halo" x={-5} y={-5} width={NODE_W + 10} height={NODE_H + 10} rx="18" /> : null}
      <rect className="math-graph-card" width={NODE_W} height={NODE_H} rx="14" />
      <rect className="math-graph-bar" x="0" y="12" width="4" height={NODE_H - 24} rx="2" />
      <clipPath id={clipId}>
        <rect x="12" y="2" width={NODE_W - 40} height={NODE_H - 4} />
      </clipPath>
      <text className="math-graph-badge" x="14" y="20" clipPath={`url(#${clipId})`}>
        {node.badge}
      </text>
      <text className="math-graph-label" x="14" y={node.line2 ? 40 : 46} clipPath={`url(#${clipId})`}>
        {node.line1}
      </text>
      {node.line2 ? (
        <text className="math-graph-label" x="14" y="56" clipPath={`url(#${clipId})`}>
          {node.line2}
        </text>
      ) : null}
      {learned ? (
        <g className="math-graph-check" transform={`translate(${NODE_W - 28} 8)`}>
          <circle cx="9" cy="9" r="9" />
          <path d="M5 9.2 8 12.1 13.2 6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  )
}

function legendLabel(kind: Statement['kind']): string {
  const labels: Record<Statement['kind'], string> = {
    definition: 'определения',
    theorem: 'теоремы',
    lemma: 'леммы',
    corollary: 'следствия',
    axiom: 'аксиомы',
    principle: 'принципы',
    remark: 'замечания',
    example: 'примеры',
    exercise: 'задачи',
    prose: 'текст',
  }
  return labels[kind]
}

function sectionHeading(group: ContentGroup): string {
  const title = group.sectionTitle.replace(/\s+/g, ' ').trim()
  const short = title.length > 36 ? `${title.slice(0, 34).trimEnd()}…` : title
  return short ? `${group.sectionId}. ${short}` : group.sectionId
}

function buildContents(query: string, onGraph: Set<string>): ContentGroup[] {
  const pool = STATEMENTS.filter(
    (item) =>
      onGraph.has(item.id) ||
      (item.kind !== 'prose' && item.kind !== 'exercise' && item.kind !== 'example'),
  )
  const found = query.trim()
    ? searchStatements(query, pool, 40)
    : pool.filter((item) => onGraph.has(item.id)).sort((left, right) => left.bookPage - right.bookPage)
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

function ruCount(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11 ? forms[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? forms[1] : forms[2]
  return `${n} ${word}`
}

function readableView(viewW: number, contentW: number): View {
  const pad = 16
  const k = Math.min((viewW - pad * 2) / Math.max(contentW, 1), 1.05)
  const scale = Math.min(1.05, Math.max(k, 0.82))
  return {
    k: scale,
    x: (viewW - contentW * scale) / 2,
    y: 10,
  }
}

function fitView(viewW: number, viewH: number, contentW: number, contentH: number): View {
  const pad = 28
  const availW = Math.max(1, viewW - pad * 2)
  const availH = Math.max(1, viewH - pad * 2)
  const k = Math.min(availW / Math.max(contentW, 1), availH / Math.max(contentH, 1), 1.15)
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
