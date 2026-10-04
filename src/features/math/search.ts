import { KIND_LABEL, type Statement } from '../../data/math/bank'

const YO = /ё/g

export function normalizeMathQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(YO, 'е')
    .replace(/[^0-9a-zа-я.\-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(left: string, right: string): number {
  const gap = Math.abs(left.length - right.length)
  if (gap > 2) return gap
  const rows = left.length + 1
  const cols = right.length + 1
  const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))
  for (let row = 0; row < rows; row += 1) grid[row][0] = row
  for (let col = 0; col < cols; col += 1) grid[0][col] = col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      let best = Math.min(grid[row - 1][col] + 1, grid[row][col - 1] + 1, grid[row - 1][col - 1] + cost)
      if (
        row > 1 &&
        col > 1 &&
        left[row - 1] === right[col - 2] &&
        left[row - 2] === right[col - 1]
      ) {
        best = Math.min(best, grid[row - 2][col - 2] + 1)
      }
      grid[row][col] = best
    }
  }
  return grid[rows - 1][cols - 1]
}

function typoLimit(token: string): number {
  if (token.length >= 8) return 2
  if (token.length >= 5) return 1
  return 0
}

function wordScore(token: string, candidate: string): number {
  if (!token || !candidate) return 0
  if (token === candidate) return 1
  if (token.length >= 4 && candidate.startsWith(token)) return 0.9
  if (token.length >= 5 && token.startsWith(candidate) && candidate.length >= token.length - 2) return 0.86
  if (token.length >= 4 && candidate.includes(token)) return 0.84
  const limit = typoLimit(token)
  if (!limit) return 0
  const distance = editDistance(token, candidate)
  if (distance <= 0 || distance > limit) return 0
  return 0.78 - distance * 0.12
}

function bestWord(token: string, words: string[]): number {
  let best = 0
  for (const word of words) {
    const score = wordScore(token, word)
    if (score > best) best = score
    if (best === 1) break
  }
  return best
}

function wordsOf(value: string): string[] {
  const normalized = normalizeMathQuery(value)
  if (!normalized) return []
  return normalized.split(/[\s-]+/).filter(Boolean)
}

export function scoreStatement(statement: Statement, query: string): number {
  const normalized = normalizeMathQuery(query)
  if (!normalized) return 0
  const tokens = normalized.split(' ')
  const titleWords = wordsOf(`${statement.title} ${statement.number ?? ''} ${statement.id}`)
  const kindWords = wordsOf(`${KIND_LABEL[statement.kind]} ${statement.sectionTitle}`)
  const bodyWords = wordsOf(`${statement.formulation ?? ''} ${statement.text}`)
  const titleBlob = titleWords.join(' ')
  let score = 0
  if (titleBlob === normalized || statement.number === normalized || statement.id === normalized) score += 100
  else if (titleBlob.includes(normalized)) score += 40

  for (const token of tokens) {
    const title = bestWord(token, titleWords)
    const kind = bestWord(token, kindWords)
    const body = bestWord(token, bodyWords)
    const best = Math.max(title * 3, kind * 1.4, body)
    if (token.length >= 3 && best <= 0) return 0
    score += best
  }
  return score
}

export function searchStatements(query: string, statements: Statement[], limit = 80): Statement[] {
  const normalized = normalizeMathQuery(query)
  if (!normalized) return []
  const scored = statements
    .map((statement) => ({ statement, score: scoreStatement(statement, query) }))
    .filter((entry) => entry.score > 0)
  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    return left.statement.title.localeCompare(right.statement.title, 'ru')
  })
  return scored.slice(0, Math.max(0, limit)).map((entry) => entry.statement)
}
