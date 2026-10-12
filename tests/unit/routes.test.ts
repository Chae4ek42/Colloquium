import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isKnownPath,
  normalizePath,
  parsePath,
  pathForPage,
  pathForRoute,
  shouldHandleClientNav,
} from '../../src/shared/lib/routes.ts'

describe('routes', () => {
  it('нормализует слэши', () => {
    assert.equal(normalizePath('/'), '/')
    assert.equal(normalizePath('/train/'), '/train')
    assert.equal(normalizePath('/catalog/'), '/catalog')
  })

  it('парсит известные пути', () => {
    assert.deepEqual(parsePath('/'), { page: 'home' })
    assert.deepEqual(parsePath('/train'), { page: 'train' })
    assert.deepEqual(parsePath('/graph'), { page: 'graph' })
    assert.deepEqual(parsePath('/catalog'), { page: 'catalog' })
    assert.deepEqual(parsePath('/learned'), { page: 'learned' })
    assert.deepEqual(parsePath('/p/thm-1.5'), { page: 'statement', statementId: 'thm-1.5' })
    assert.equal(isKnownPath('/p/thm-1.5'), true)
    assert.equal(isKnownPath('/graph'), true)
    assert.equal(isKnownPath('/catalog'), true)
    assert.equal(isKnownPath('/learned'), true)
    assert.equal(isKnownPath('/train'), true)
  })

  it('неизвестный путь отдаёт home при парсинге', () => {
    assert.deepEqual(parsePath('/nope'), { page: 'home' })
    assert.equal(isKnownPath('/nope'), false)
    assert.equal(isKnownPath('/kana'), false)
  })

  it('строит пути из маршрута и страницы', () => {
    assert.equal(pathForRoute({ page: 'train' }), '/train')
    assert.equal(pathForRoute({ page: 'graph' }), '/graph')
    assert.equal(pathForPage('train'), '/train')
    assert.equal(pathForPage('home'), '/')
    assert.equal(pathForPage('catalog'), '/catalog')
  })

  it('реестр страниц покрывает навбар', async () => {
    const { PAGE_META, navItems } = await import('../../src/shared/lib/pages.ts')
    const nav = navItems('primary').map((page) => page.id)
    assert.deepEqual(nav, ['home', 'catalog', 'learned', 'train', 'graph'])
    assert.equal(
      PAGE_META.every((page) => pathForPage(page.id) === page.path),
      true,
    )
  })

  it('shouldHandleClientNav пропускает модификаторы', () => {
    assert.equal(shouldHandleClientNav({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), true)
    assert.equal(shouldHandleClientNav({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), false)
    assert.equal(shouldHandleClientNav({ button: 1, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), false)
  })
})
