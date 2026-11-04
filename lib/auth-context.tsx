'use client'

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { getSession, setUnauthorizedHandler, signIn, signOut, type TutorUser } from './api'

interface AuthState {
  user: TutorUser | null
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TutorUser | null>(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setUnauthorizedHandler(() => { if (active) setUser(null) })
    getSession()
      .then((value) => { if (active) setUser(value) })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof Error && 'status' in reason && reason.status === 401)) {
          setError(reason instanceof Error ? reason.message : 'Could not check your session.')
        }
      })
      .finally(() => { if (active) setPending(false) })
    return () => { active = false; setUnauthorizedHandler(null) }
  }, [])

  async function login(email: string, password: string) {
    setError(null)
    try {
      setUser(await signIn(email, password))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.')
    }
  }

  async function logout() {
    setError(null)
    try {
      await signOut()
      setUser(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-out failed.')
    }
  }

  const state: AuthState = { user, error, login, logout }
  return (
    <AuthContext.Provider value={state}>
      {pending ? <div role="status" className="p-8 text-sm text-muted-foreground">Checking your session…</div> : children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) throw new Error('useAuth must be used within AuthProvider')
  return state
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, error, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <>{children}</>

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try { await login(email, password) }
    finally { setSubmitting(false) }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold">Sign in to TutorTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your private GCSE maths tutoring dashboard.</p>
        </div>
        <label className="block space-y-1 text-sm font-medium">
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground" />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground" />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
