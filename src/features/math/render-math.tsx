import { type ReactNode } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { findCitations, type Citation } from './citations'
import { displayName } from './present'
import { getStatement } from '../../data/math/bank'
import { StatementLink } from './ui'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderFormula(source: string, display: boolean): string {
  try {
    return katex.renderToString(source.trim(), {
      displayMode: display,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    })
  } catch {
    return escapeHtml(source)
  }
}

function plainNodes(text: string, contextId: string | undefined, notes: Citation[], key: string): ReactNode[] {
  const hits = findCitations(text, contextId)
  const nodes: ReactNode[] = []
  let cursor = 0
  hits.forEach((hit, index) => {
    if (hit.start > cursor) nodes.push(text.slice(cursor, hit.start))
    notes.push(hit)
    nodes.push(
      <StatementLink key={`${key}-cite-${index}`} id={hit.id} className="math-cite" title={hit.note}>
        {hit.phrase}
      </StatementLink>,
    )
    cursor = hit.end
  })
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function richNodes(source: string, contextId: string | undefined, notes: Citation[], key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let part = 0
  while (cursor < source.length) {
    const at = source.indexOf('\\emph{', cursor)
    if (at < 0) {
      nodes.push(...mathNodes(source.slice(cursor), contextId, notes, `${key}-m${part}`))
      break
    }
    nodes.push(...mathNodes(source.slice(cursor, at), contextId, notes, `${key}-m${part}`))
    part += 1
    const innerStart = at + '\\emph{'.length
    let depth = 1
    let end = innerStart
    while (end < source.length && depth > 0) {
      if (source[end] === '{') depth += 1
      else if (source[end] === '}') depth -= 1
      end += 1
    }
    nodes.push(
      <em key={`${key}-em${part}`}>{richNodes(source.slice(innerStart, end - 1), contextId, notes, `${key}-em${part}`)}</em>,
    )
    cursor = end
    part += 1
  }
  return nodes
}

function mathNodes(source: string, contextId: string | undefined, notes: Citation[], key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let cursor = 0
  let part = 0
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0
    nodes.push(...plainNodes(source.slice(cursor, start), contextId, notes, `${key}-p${part}`))
    const html = match[1] != null ? renderFormula(match[1], true) : renderFormula(match[2] ?? '', false)
    nodes.push(<span key={`${key}-k${part}`} dangerouslySetInnerHTML={{ __html: html }} />)
    cursor = start + match[0].length
    part += 1
  }
  nodes.push(...plainNodes(source.slice(cursor), contextId, notes, `${key}-p${part}`))
  return nodes
}

export function MathText({ source, contextId }: { source: string; contextId?: string }) {
  const notes: Citation[] = []
  const paragraphs = source
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!paragraphs.length) return null
  const seen = new Set<string>()
  const unique: Citation[] = []
  const body = paragraphs.map((paragraph, index) => (
    <p key={index}>{richNodes(paragraph, contextId, notes, `p${index}`)}</p>
  ))
  for (const note of notes) {
    if (seen.has(note.id)) continue
    seen.add(note.id)
    unique.push(note)
  }
  return (
    <div className="math-prose">
      {body}
      {unique.length ? (
        <ul className="math-cites">
          {unique.map((note) => {
            const target = getStatement(note.id)
            const label = target ? displayName(target) : note.phrase
            return (
              <li key={note.id}>
                <StatementLink id={note.id} className="math-cite">
                  {label}
                </StatementLink>
                <span> — {note.note}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
