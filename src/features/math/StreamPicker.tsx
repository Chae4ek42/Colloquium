import { useState } from 'react'
import { listSources } from '../../data/math/bank'
import { LEGACY_STREAM_KEY, readScopedRaw, streamStorageKey } from '../../data/math/source'
import { useMathSource } from './SourceContext'
import { STREAM_FILTERS, type StreamFilter } from './streams'

function readSavedStream(sourceId: string): StreamFilter {
  try {
    const saved = readScopedRaw(
      localStorage,
      sourceId,
      streamStorageKey(sourceId),
      LEGACY_STREAM_KEY,
      listSources()[0]?.id ?? sourceId,
    )
    if (STREAM_FILTERS.some((item) => item.id === saved)) return saved as StreamFilter
  } catch {
    /* выбор потока остаётся «все вопросы» */
  }
  return 'all'
}

export function useSavedStream() {
  const { sourceId } = useMathSource()
  const [stream, setStream] = useState<StreamFilter>(() => readSavedStream(sourceId))

  function choose(next: StreamFilter) {
    setStream(next)
    localStorage.setItem(streamStorageKey(sourceId), next)
  }

  return { stream, choose }
}

export function StreamPicker({
  stream,
  onChoose,
}: {
  stream: StreamFilter
  onChoose: (next: StreamFilter) => void
}) {
  return (
    <div className="math-stream-filter" role="group" aria-label="Поток">
      {STREAM_FILTERS.map((option) => (
        <button
          key={option.id}
          type="button"
          data-testid={`stream-${option.id}`}
          className={stream === option.id ? 'math-stream-option is-active' : 'math-stream-option'}
          aria-pressed={stream === option.id}
          onClick={() => onChoose(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
