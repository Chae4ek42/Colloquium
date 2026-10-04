import katex from 'katex'
import 'katex/dist/katex.min.css'

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

function renderMathParts(source: string): string {
  const chunks: string[] = []
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let cursor = 0
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0
    chunks.push(escapeHtml(source.slice(cursor, start)))
    if (match[1] != null) chunks.push(renderFormula(match[1], true))
    else if (match[2] != null) chunks.push(renderFormula(match[2], false))
    cursor = start + match[0].length
  }
  chunks.push(escapeHtml(source.slice(cursor)))
  return chunks.join('')
}

function renderRich(source: string): string {
  let html = ''
  let cursor = 0
  while (cursor < source.length) {
    const at = source.indexOf('\\emph{', cursor)
    if (at < 0) {
      html += renderMathParts(source.slice(cursor))
      break
    }
    html += renderMathParts(source.slice(cursor, at))
    const innerStart = at + '\\emph{'.length
    let depth = 1
    let end = innerStart
    while (end < source.length && depth > 0) {
      if (source[end] === '{') depth += 1
      else if (source[end] === '}') depth -= 1
      end += 1
    }
    html += `<em>${renderRich(source.slice(innerStart, end - 1))}</em>`
    cursor = end
  }
  return html
}

export function MathText({ source }: { source: string }) {
  const paragraphs = source
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!paragraphs.length) return null
  return (
    <div className="math-prose">
      {paragraphs.map((paragraph, index) => (
        <p key={index} dangerouslySetInnerHTML={{ __html: renderRich(paragraph) }} />
      ))}
    </div>
  )
}
