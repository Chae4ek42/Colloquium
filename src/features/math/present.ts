import { KIND_LABEL, flowText, shortName, type Statement } from '../../data/math/bank'

export function displayName(statement: Statement): string {
  const kind = KIND_LABEL[statement.kind]
  const number = statement.number
  const short = shortName(statement.id)
  const head = number ? `${kind} ${number}` : kind
  if (short) return `${head}. ${short}`
  if (statement.kind === 'example') return 'Пример'
  return head
}

export interface StatementParts {
  formulation: string
  proof: string | null
  latex: boolean
}

export function splitParts(statement: Statement): StatementParts {
  const source = (statement.latex?.trim() || statement.formulation || flowText(statement.text)).trim()
  const latex = Boolean(statement.latex?.trim()) || source.includes('$')
  const body = stripHeading(source)
  const match = body.match(/(?:^|\n+)\s*Доказательство\./)
  if (!match || match.index == null) return { formulation: body, proof: null, latex }
  const formulation = body.slice(0, match.index).trim()
  const proof = body.slice(match.index).replace(/^\s+/, '').trim()
  if (!formulation) return { formulation: proof, proof: null, latex }
  return { formulation, proof, latex }
}

const LABEL =
  /^(Теорема|Лемма|Следствие|Определение|Аксиома|Принцип|Пример|Замечание|Задача)\s*(?:[\d.′']+\s*)?(?:\([^)]{0,90}\)\s*)?\.?\s*/u

function stripHeading(source: string): string {
  const chunks = source.split(/\n\s*\n/)
  const first = chunks[0]?.trim() ?? ''
  if (!LABEL.test(first) || chunks.length < 2) return source
  const rest = first.replace(LABEL, '').trim()
  const next = chunks[1]?.trim() ?? ''
  const nextIsProof = /^Доказательство\./.test(next)
  if (rest.length < 16) {
    if (nextIsProof) return source
    return chunks.slice(1).join('\n\n').trim()
  }
  chunks[0] = rest
  return chunks.join('\n\n').trim()
}
