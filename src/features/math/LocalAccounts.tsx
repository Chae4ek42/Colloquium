import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AuthError } from '../../shared/lib/account-auth'
import {
  clearLocalSession,
  createLocalAccount,
  listLocalAccounts,
  loginLocalAccount,
  readLocalSession,
  type LocalAccount,
} from './local-accounts'
import './styles.css'

interface LocalAccountApi {
  ready: boolean
  accounts: LocalAccount[]
  accountId: string | null
  accountName: string | null
  createAccount: (name: string, password: string) => Promise<void>
  login: (accountId: string, password: string) => Promise<void>
  logout: () => void
}

const LocalAccountContext = createContext<LocalAccountApi | null>(null)

function browserStore(): Storage {
  return localStorage
}

export function LocalAccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<LocalAccount[]>(() => listLocalAccounts(browserStore()))
  const [accountId, setAccountId] = useState<string | null>(() => readLocalSession(browserStore()))

  const api = useMemo<LocalAccountApi>(() => {
    const current = accounts.find((account) => account.id === accountId) ?? null
    return {
      ready: true,
      accounts,
      accountId: current?.id ?? null,
      accountName: current?.name ?? null,
      async createAccount(name, password) {
        const created = await createLocalAccount(browserStore(), name, password)
        setAccounts(listLocalAccounts(browserStore()))
        setAccountId(created.id)
      },
      async login(id, password) {
        const entered = await loginLocalAccount(browserStore(), id, password)
        setAccountId(entered.id)
      },
      logout() {
        clearLocalSession(browserStore())
        setAccountId(null)
      },
    }
  }, [accounts, accountId])

  return <LocalAccountContext.Provider value={api}>{children}</LocalAccountContext.Provider>
}

export function useLocalAccount(): LocalAccountApi {
  const value = useContext(LocalAccountContext)
  if (!value) throw new Error('Аккаунты доступны только внутри LocalAccountProvider')
  return value
}

export function LocalAccountGate() {
  const { accounts, createAccount, login } = useLocalAccount()
  const [mode, setMode] = useState<'login' | 'create'>(accounts.length ? 'login' : 'create')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'create') await createAccount(name, password)
      else await login(accountId, password)
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="math-auth">
      <h1>Коллоквиум</h1>
      <p>{mode === 'create' ? 'Создайте аккаунт. Прогресс останется в этом браузере.' : 'Войдите в свой аккаунт.'}</p>
      <form onSubmit={(event) => void submit(event)}>
        {mode === 'create' ? (
          <label>
            Имя
            <input
              value={name}
              autoComplete="username"
              data-testid="account-name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        ) : (
          <label>
            Аккаунт
            <select
              value={accountId}
              data-testid="account-pick"
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Пароль
          <input
            type="password"
            value={password}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            data-testid="account-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="math-auth-error">{error}</p> : null}
        <button type="submit" className="primary-button" data-testid="account-submit" disabled={busy}>
          {mode === 'create' ? 'Создать' : 'Войти'}
        </button>
      </form>
      {accounts.length ? (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode((current) => (current === 'login' ? 'create' : 'login'))
            setError('')
            setPassword('')
          }}
        >
          {mode === 'login' ? 'Новый аккаунт' : 'Уже есть аккаунт'}
        </button>
      ) : null}
    </main>
  )
}
