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
import { AccountGate } from '../features/accounts/AccountGate'
import { CatalogPage } from '../features/math/CatalogPage'
import { ColloquiumHome } from '../features/math/HomePage'
import { DrillPage } from '../features/math/DrillPage'
import { GraphPage } from '../features/math/GraphPage'
import { StatementPage } from '../features/math/StatementPage'
import { MathUiProvider } from '../features/math/ui'
import { ProgressProvider } from '../features/math/progress'
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
  switch (page) {
    case 'home':
      return <ColloquiumHome />
    case 'catalog':
      return <CatalogPage mode="all" />
    case 'learned':
      return <CatalogPage mode="learned" />
    case 'train':
      return <DrillPage />
    case 'graph':
      return <GraphPage />
    case 'statement':
      return <StatementPage id={statementId ?? ''} onBack={() => onNavigate('home')} />
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
  const { exportBackup, openImportPicker, fileInputRef, onImportFileChange, canExport } = useBackupApp()
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

  if (page === 'accounts') {
    return (
      <div className="app-shell">
        <AccountGate onEntered={() => goPage('home')} onCancel={() => goPage('home')} />
      </div>
    )
  }

  return (
    <ProgressProvider>
      <MathUiProvider onOpenStatement={(id) => navigate(`/p/${encodeURIComponent(id)}`)}>
        <div className="app-shell">
          <AppHeader
            currentPage={page}
            onNavigate={goPage}
            onExportBackup={canExport ? exportBackup : undefined}
            onImportBackup={openImportPicker}
            importInputRef={fileInputRef}
            onImportFileChange={onImportFileChange}
          />
          <AppPageView page={page} statementId={statementId} onNavigate={goPage} />
        </div>
      </MathUiProvider>
    </ProgressProvider>
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
