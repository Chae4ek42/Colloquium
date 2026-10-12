import { AppHeader } from '../shared/ui/AppHeader'
import { CatalogPage } from '../features/math/CatalogPage'
import { ColloquiumHome } from '../features/math/HomePage'
import { DrillPage } from '../features/math/DrillPage'
import { GraphPage } from '../features/math/GraphPage'
import { StatementPage } from '../features/math/StatementPage'
import { MathUiProvider } from '../features/math/ui'
import { ProgressProvider } from '../features/math/progress'
import { SourceProvider, SourceSelect, useMathSource } from '../features/math/SourceContext'
import { useAppRouter } from '../shared/lib/useAppRouter'
import type { AppPage } from '../shared/lib/pages'

function AppPageView({
  page,
  statementId,
  onNavigate,
}: {
  page: AppPage
  statementId?: string
  onNavigate: (page: AppPage) => void
}) {
  const { sourceId } = useMathSource()
  switch (page) {
    case 'home':
      return <ColloquiumHome key={sourceId} />
    case 'catalog':
      return <CatalogPage key={sourceId} mode="all" />
    case 'learned':
      return <CatalogPage key={`${sourceId}:learned`} mode="learned" />
    case 'train':
      return <DrillPage key={sourceId} />
    case 'graph':
      return <GraphPage key={sourceId} />
    case 'statement':
      return (
        <StatementPage
          key={`${sourceId}:${statementId ?? ''}`}
          id={statementId ?? ''}
          onBack={() => onNavigate('home')}
        />
      )
  }
}

function AppRoutes() {
  const { page, statementId, navigate, goPage } = useAppRouter()

  return (
    <SourceProvider>
      <ProgressProvider>
        <MathUiProvider onOpenStatement={(id) => navigate(`/p/${encodeURIComponent(id)}`)}>
          <div className="app-shell">
            <AppHeader currentPage={page} onNavigate={goPage} toolbar={<SourceSelect />} />
            <AppPageView page={page} statementId={statementId} onNavigate={goPage} />
          </div>
        </MathUiProvider>
      </ProgressProvider>
    </SourceProvider>
  )
}

export default function App() {
  return <AppRoutes />
}
