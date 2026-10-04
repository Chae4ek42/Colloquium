import { useEffect, useState } from 'react'
import type { Statement } from '../../data/math/bank'

export function PagePhoto({ statement }: { statement: Statement }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pages = statement.bookPages?.length ? statement.bookPages : [statement.bookPage]

  return (
    <>
      <button type="button" className="math-photo" onClick={() => setOpen(true)}>
        Фото
      </button>
      {open ? (
        <div className="math-quick-backdrop" onClick={() => setOpen(false)}>
          <article
            className="math-photo-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Страницы пособия: ${pages.join(', ')}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="math-photo-head">
              <p>Пособие, стр. {pages.join(', ')}</p>
              <button type="button" className="text-button" onClick={() => setOpen(false)}>
                Закрыть
              </button>
            </header>
            <div className="math-pages">
              {statement.pageSrcs.map((src, index) => (
                <img
                  key={src}
                  className="math-page"
                  src={src}
                  alt={`Страница ${pages[index] ?? statement.bookPage} пособия`}
                />
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </>
  )
}
