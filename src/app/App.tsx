import { AppHeader } from '../shared/ui/AppHeader'
import { HomePage } from '../features/home/HomePage'
import { KanaTrainer } from '../features/kana/KanaTrainer'
import { KanjiPage } from '../features/kanji/KanjiPage'
import { NumbersTrainer } from '../features/numbers/NumbersTrainer'
import { ParticlesTrainer } from '../features/particles/ParticlesTrainer'
import { VerbsTrainer } from '../features/verbs/VerbsTrainer'
import { TextReaderPage } from '../features/reader/TextReaderPage'
import { DictionaryPage } from '../features/vocab/DictionaryPage'
import { MineWordsPage } from '../features/vocab/MineWordsPage'
import { TrainPage } from '../features/vocab/TrainPage'
import { TheoryPage } from '../features/theory/TheoryPage'
import { AnalyticsPage } from '../features/analytics/AnalyticsPage'
import { CatalogPage } from '../features/math/CatalogPage'
import { ColloquiumHome } from '../features/math/HomePage'
import { DrillPage } from '../features/math/DrillPage'
import { GraphPage } from '../features/math/GraphPage'
import { StatementPage } from '../features/math/StatementPage'
import { MathUiProvider } from '../features/math/ui'
import { ProgressProvider } from '../features/math/progress'
import { SourceProvider, SourceSelect, useMathSource } from '../features/math/SourceContext'
// неактуально: вход по аккаунту спрятан, прогресс лежит в общем localStorage.
import { useAppRouter } from '../shared/lib/useAppRouter'
import { useActiveTimeTracker } from '../shared/lib/useActiveTimeTracker'
import type { AppPage } from '../shared/lib/types'
import {
  AppStateProvider,
  useAccounts,
  useAnalyticsState,
  useAppState,
} from '../shared/state/AppStateContext'
import { useBackupApp } from '../shared/state/backup'

// неактуально: словарная тренировка japanese. Маршрут /train отдан коллоквиуму.
void TrainPage

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
    case 'kanji':
      return <KanjiPage />
    case 'vocab':
      return <DictionaryPage />
    case 'mine':
      return <MineWordsPage />
    case 'theory':
      return <TheoryPage onOpenTrain={() => onNavigate('train')} onOpenPage={onNavigate} />
    case 'analytics':
      return <AnalyticsPage />
    case 'reader':
      return <TextReaderPage onNavigate={onNavigate} />
    case 'kana':
      return (
        <main className="trainer-layout">
          <KanaTrainer />
        </main>
      )
    case 'numbers':
      return (
        <main className="trainer-layout">
          <NumbersTrainer />
        </main>
      )
    case 'particles':
      return (
        <main className="trainer-layout">
          <ParticlesTrainer />
        </main>
      )
    case 'verbs':
      return (
        <main className="trainer-layout">
          <VerbsTrainer />
        </main>
      )
    default:
      return <HomePage onNavigate={onNavigate} />
  }
}

function AppRoutes() {
  const appState = useAppState()
  const { storageReady } = useAccounts()
  const { page, statementId, navigate, goPage } = useAppRouter()
  const { exportBackup, canExport } = useBackupApp()
  const { applyActiveDeltas } = useAnalyticsState()

  useActiveTimeTracker({
    page,
    enabled: Boolean(appState) && page !== 'accounts',
    onFlush: applyActiveDeltas,
  })

  if (!storageReady || !appState) {
    return (
      <div className="app-shell app-loading">
        <p>Загрузка…</p>
      </div>
    )
  }

  return (
    <SourceProvider>
      <ProgressProvider>
        <MathUiProvider onOpenStatement={(id) => navigate(`/p/${encodeURIComponent(id)}`)}>
          <div className="app-shell">
            <AppHeader
              currentPage={page}
              onNavigate={goPage}
              toolbar={<SourceSelect />}
              onExportBackup={canExport ? exportBackup : undefined}
            />
            <AppPageView page={page} statementId={statementId} onNavigate={goPage} />
          </div>
        </MathUiProvider>
      </ProgressProvider>
    </SourceProvider>
  )
}

function App() {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  )
}

export default App
