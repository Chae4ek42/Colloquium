export type AppPage = 'home' | 'catalog' | 'learned' | 'train' | 'graph' | 'statement'

export type NavGroup = 'primary' | 'none'

export interface PageMeta {
  id: AppPage
  path: string
  documentTitle: string
  navLabel: string
  navTestId: string
  navGroup: NavGroup
}

export const PATHS = {
  home: '/',
  train: '/train',
  graph: '/graph',
  catalog: '/catalog',
  learned: '/learned',
  statement: '/p',
} as const

export const PAGE_META: PageMeta[] = [
  {
    id: 'home',
    path: PATHS.home,
    documentTitle: 'Коллоквиум',
    navLabel: 'Главная',
    navTestId: 'nav-main',
    navGroup: 'primary',
  },
  {
    id: 'catalog',
    path: PATHS.catalog,
    documentTitle: 'Каталог — Коллоквиум',
    navLabel: 'Каталог',
    navTestId: 'nav-catalog',
    navGroup: 'primary',
  },
  {
    id: 'learned',
    path: PATHS.learned,
    documentTitle: 'Выученные — Коллоквиум',
    navLabel: 'Выученные',
    navTestId: 'nav-learned',
    navGroup: 'primary',
  },
  {
    id: 'train',
    path: PATHS.train,
    documentTitle: 'Тренировка — Коллоквиум',
    navLabel: 'Тренировка',
    navTestId: 'nav-train',
    navGroup: 'primary',
  },
  {
    id: 'graph',
    path: PATHS.graph,
    documentTitle: 'Граф — Коллоквиум',
    navLabel: 'Граф',
    navTestId: 'nav-graph',
    navGroup: 'primary',
  },
  {
    id: 'statement',
    path: PATHS.statement,
    documentTitle: 'Положение — Коллоквиум',
    navLabel: 'Положение',
    navTestId: 'nav-statement',
    navGroup: 'none',
  },
]

const PAGE_BY_ID = Object.fromEntries(PAGE_META.map((page) => [page.id, page])) as Record<AppPage, PageMeta>
const PAGE_BY_PATH = new Map(PAGE_META.map((page) => [page.path, page]))

export function getPageMeta(id: AppPage): PageMeta {
  return PAGE_BY_ID[id]
}

export function navItems(group: Exclude<NavGroup, 'none'>): PageMeta[] {
  return PAGE_META.filter((page) => page.navGroup === group)
}

export function titleForPage(id: AppPage): string {
  return PAGE_BY_ID[id].documentTitle
}

export function pathForPage(page: AppPage): string {
  return PAGE_BY_ID[page].path
}

export function pageFromPath(pathname: string): AppPage | null {
  return PAGE_BY_PATH.get(pathname)?.id ?? null
}

export function isKnownPagePath(pathname: string): boolean {
  return PAGE_BY_PATH.has(pathname)
}
