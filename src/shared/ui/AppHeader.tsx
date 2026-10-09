import type { AppPage } from '../lib/types'
import { PATHS, shouldHandleClientNav } from '../lib/routes'
import { navItems } from '../lib/pages'
import type { ReactNode } from 'react'

export interface AppHeaderProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
  toolbar?: ReactNode
  accountName?: string
  onSignOut?: () => void
  onExportBackup?: () => void
}

const NAV_ITEMS = navItems('primary')

export function AppHeader({
  currentPage,
  onNavigate,
  toolbar,
  accountName,
  onSignOut,
  onExportBackup,
}: AppHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-top">
        <div className="site-header-brand">
          <a
            href={PATHS.home}
            className="site-logo"
            data-testid="nav-home"
            onClick={(event) => {
              if (shouldHandleClientNav(event)) {
                event.preventDefault()
                onNavigate('home')
              }
            }}
          >
            Коллоквиум
          </a>
        </div>

        <div className="site-header-actions">
          {toolbar}
          {accountName ? <span className="site-account-name">{accountName}</span> : null}
          {onSignOut ? (
            <button type="button" className="text-button" data-testid="sign-out" onClick={onSignOut}>
              Выйти
            </button>
          ) : null}
          {onExportBackup ? (
            <button type="button" className="text-button" data-testid="export-backup" onClick={onExportBackup}>
              Экспорт
            </button>
          ) : null}
        </div>
      </div>

      <nav className="site-nav" aria-label="Основная навигация">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.path}
            data-testid={item.navTestId}
            className={currentPage === item.id ? 'site-nav-link is-active' : 'site-nav-link'}
            onClick={(event) => {
              if (shouldHandleClientNav(event)) {
                event.preventDefault()
                onNavigate(item.id)
              }
            }}
          >
            {item.navLabel}
          </a>
        ))}
      </nav>
    </header>
  )
}
