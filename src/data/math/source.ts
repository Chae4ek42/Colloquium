import type { ExamQuestion, StatementRecord } from './types'

/**
 * Один учебник. Приложение не смешивает пакеты:
 * положения, вопросы, LaTeX и короткие имена берутся только из активного пакета.
 * Фото страниц лежат отдельно, в `pagesDir`.
 */
export interface MathSource {
  id: string
  title: string
  author: string
  statements: StatementRecord[]
  /** Явные рёбра «следует из». Заменяют dependsOn из JSON. */
  depends: Record<string, string[]>
  /** Короткая формулировка для билета. Если нет — берётся latex, иначе text. */
  formulations: Record<string, string>
  /** Текст с формулами. Если нет — показывается formulations или text. */
  latex: Record<string, string>
  /** Короткое имя карточки. Если нет — «Вид номер». */
  shortNames: Record<string, string>
  questions: ExamQuestion[]
  /** Каталог фото, без слэша в конце. Страница 6 → `${pagesDir}/p006.jpg`. */
  pagesDir: string
}

export const SOURCE_KEY = 'colloquium-source-v1'
export const LEGACY_PROGRESS_KEY = 'colloquium-progress-v1'
export const LEGACY_STREAM_KEY = 'colloquium-stream-v1'

export function progressStorageKey(sourceId: string): string {
  return `${LEGACY_PROGRESS_KEY}:${sourceId}`
}

export function streamStorageKey(sourceId: string): string {
  return `${LEGACY_STREAM_KEY}:${sourceId}`
}

/** Своя запись источника. Старый ключ без суффикса читается только у источника по умолчанию. */
export function readScopedRaw(
  store: { getItem(key: string): string | null },
  sourceId: string,
  scopedKey: string,
  legacyKey: string,
  defaultSourceId: string,
): string | null {
  const scoped = store.getItem(scopedKey)
  if (scoped != null) return scoped
  if (sourceId !== defaultSourceId) return null
  return store.getItem(legacyKey)
}

let sources: MathSource[] = []
let activeId = ''

export function registerSources(next: MathSource[], initialId?: string | null): void {
  if (!next.length) throw new Error('Нужен хотя бы один источник положений')
  const unique = new Map(next.map((item) => [item.id, item]))
  sources = [...unique.values()]
  const preferred = initialId && unique.has(initialId) ? initialId : sources[0]?.id
  activeId = preferred ?? ''
}

export function listSources(): MathSource[] {
  return sources
}

export function activeSource(): MathSource {
  const found = sources.find((item) => item.id === activeId) ?? sources[0]
  if (!found) throw new Error('Источник положений не выбран')
  return found
}

export function activateSource(id: string): boolean {
  if (!sources.some((item) => item.id === id) || id === activeId) return false
  activeId = id
  return true
}
