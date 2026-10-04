import { STATEMENTS, getStatement, type Statement } from '../../data/math/bank'
import type { StatementKind } from '../../data/math/types'
import { findCitations } from './citations'

const CONSEQUENCE: Set<StatementKind> = new Set(['theorem', 'lemma', 'corollary'])

let priors: Map<string, string[]> | null = null

function priorMap(): Map<string, string[]> {
  if (priors) return priors
  const map = new Map<string, string[]>()
  for (const item of STATEMENTS) {
    const source = item.latex?.trim() || item.formulation || ''
    const cited = findCitations(source, item.id).map((hit) => hit.id)
    const mentioned = item.mentions.filter((id) => id !== item.id)
    map.set(item.id, [...new Set([...item.dependsOn, ...cited, ...mentioned])])
  }
  priors = map
  return map
}

function resolve(ids: string[]): Statement[] {
  return ids
    .map((id) => getStatement(id))
    .filter((item): item is Statement => item !== null)
}

function pointingAt(id: string): Statement[] {
  const found: Statement[] = []
  for (const [source, edges] of priorMap()) {
    if (source === id || !edges.includes(id)) continue
    const item = getStatement(source)
    if (item) found.push(item)
  }
  return found
}

export function priorIds(id: string): string[] {
  return priorMap().get(id) ?? []
}

export function followsFrom(id: string): Statement[] {
  return resolve(priorIds(id))
}

export function leadsTo(id: string): Statement[] {
  return pointingAt(id).filter((item) => CONSEQUENCE.has(item.kind))
}

export function usedIn(id: string): Statement[] {
  return pointingAt(id).filter((item) => !CONSEQUENCE.has(item.kind))
}

