import type { AppPage } from './types'
import { isKnownPagePath, pageFromPath, pathForPage as pathForPageId, titleForPage } from './pages'

export type AppRoute = { page: AppPage; statementId?: string }

export { PATHS } from './pages'

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/'
  }
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function parsePath(pathname: string): AppRoute {
  const path = normalizePath(pathname)
  const statement = /^\/p\/([^/]+)$/.exec(path)
  if (statement?.[1]) {
    return { page: 'statement', statementId: decodeURIComponent(statement[1]) }
  }
  return { page: pageFromPath(path) ?? 'home' }
}

export function pathForRoute(route: AppRoute): string {
  return pathForPageId(route.page)
}

export function pathForPage(page: AppPage): string {
  return pathForPageId(page)
}

export function isKnownPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  if (/^\/p\/[^/]+$/.test(path)) return true
  return isKnownPagePath(path)
}

export function titleForRoute(route: AppRoute): string {
  return titleForPage(route.page)
}

/** Left-click without modifier keys → client-side navigation. */
export function shouldHandleClientNav(event: {
  button?: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  return (
    (event.button === undefined || event.button === 0) &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}
