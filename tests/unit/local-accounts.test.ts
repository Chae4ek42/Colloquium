import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AuthError } from '../../src/shared/lib/account-auth.ts'
import {
  clearLocalSession,
  createLocalAccount,
  listLocalAccounts,
  loginLocalAccount,
  progressKey,
  readLocalSession,
  type KeyValueStore,
} from '../../src/features/math/local-accounts.ts'

function memoryStore(seed: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(seed))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

describe('локальные аккаунты', () => {
  it('помнит вход, пока сессию не закрыли', async () => {
    const store = memoryStore()
    const created = await createLocalAccount(store, 'Анна', '1234')
    assert.equal(readLocalSession(store), created.id)
    clearLocalSession(store)
    assert.equal(readLocalSession(store), null)
    assert.equal(listLocalAccounts(store).length, 1)
    const again = await loginLocalAccount(store, created.id, '1234')
    assert.equal(readLocalSession(store), again.id)
  })

  it('не пускает с чужим паролем и переносит старый прогресс первому аккаунту', async () => {
    const store = memoryStore({
      'colloquium-progress-v1': '{"learned":["thm-1.5"],"stats":{}}',
    })
    const created = await createLocalAccount(store, 'Анна', '1234')
    assert.equal(store.getItem('colloquium-progress-v1'), null)
    assert.match(store.getItem(progressKey(created.id)) ?? '', /thm-1.5/)
    await assert.rejects(() => loginLocalAccount(store, created.id, '0000'), AuthError)
    assert.equal(readLocalSession(store), created.id)
  })
})
