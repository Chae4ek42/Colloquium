import { AuthError, hashPassword, validatePassword, verifyPassword } from '../../shared/lib/account-auth'

const ACCOUNTS_KEY = 'colloquium-accounts-v1'
const SESSION_KEY = 'colloquium-session-v1'
const LEGACY_PROGRESS_KEY = 'colloquium-progress-v1'
const LEGACY_STREAM_KEY = 'colloquium-stream-v1'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface LocalAccount {
  id: string
  name: string
}

interface StoredAccount extends LocalAccount {
  salt: string
  hash: string
}

export function progressKey(accountId: string): string {
  return `${LEGACY_PROGRESS_KEY}:${accountId}`
}

export function streamKey(accountId: string): string {
  return `${LEGACY_STREAM_KEY}:${accountId}`
}

function readAccounts(store: KeyValueStore): StoredAccount[] {
  try {
    const raw = store.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is StoredAccount =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.salt === 'string' &&
        typeof item.hash === 'string',
    )
  } catch {
    return []
  }
}

function writeAccounts(store: KeyValueStore, accounts: StoredAccount[]): void {
  store.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function listLocalAccounts(store: KeyValueStore): LocalAccount[] {
  return readAccounts(store).map(({ id, name }) => ({ id, name }))
}

export function readLocalSession(store: KeyValueStore): string | null {
  try {
    const raw = store.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { accountId?: unknown }
    if (typeof parsed.accountId !== 'string' || !parsed.accountId) return null
    if (!readAccounts(store).some((account) => account.id === parsed.accountId)) {
      store.removeItem(SESSION_KEY)
      return null
    }
    return parsed.accountId
  } catch {
    return null
  }
}

export function clearLocalSession(store: KeyValueStore): void {
  store.removeItem(SESSION_KEY)
}

function adoptLegacyData(store: KeyValueStore, accountId: string): void {
  const progress = store.getItem(LEGACY_PROGRESS_KEY)
  if (progress && !store.getItem(progressKey(accountId))) {
    store.setItem(progressKey(accountId), progress)
    store.removeItem(LEGACY_PROGRESS_KEY)
  }
  const stream = store.getItem(LEGACY_STREAM_KEY)
  if (stream && !store.getItem(streamKey(accountId))) {
    store.setItem(streamKey(accountId), stream)
    store.removeItem(LEGACY_STREAM_KEY)
  }
}

export async function createLocalAccount(
  store: KeyValueStore,
  name: string,
  password: string,
): Promise<LocalAccount> {
  validatePassword(password)
  const trimmed = name.trim().slice(0, 32)
  if (!trimmed) throw new AuthError('Введите имя', 'missing')
  const accounts = readAccounts(store)
  if (accounts.some((account) => account.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new AuthError('Такое имя уже есть', 'invalid')
  }
  const { salt, hash } = await hashPassword(password)
  const account: StoredAccount = {
    id: globalThis.crypto.randomUUID(),
    name: trimmed,
    salt,
    hash,
  }
  const first = accounts.length === 0
  writeAccounts(store, [...accounts, account])
  if (first) adoptLegacyData(store, account.id)
  store.setItem(SESSION_KEY, JSON.stringify({ accountId: account.id }))
  return { id: account.id, name: account.name }
}

export async function loginLocalAccount(
  store: KeyValueStore,
  accountId: string,
  password: string,
): Promise<LocalAccount> {
  const account = readAccounts(store).find((item) => item.id === accountId)
  if (!account) throw new AuthError('Аккаунт не найден', 'invalid')
  const ok = await verifyPassword(password, account.salt, account.hash)
  if (!ok) throw new AuthError('Неверный пароль', 'invalid')
  store.setItem(SESSION_KEY, JSON.stringify({ accountId: account.id }))
  return { id: account.id, name: account.name }
}
