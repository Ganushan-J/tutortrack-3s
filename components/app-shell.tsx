'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutDashboard, LogOut, NotebookPen, Sigma, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTutorStore } from '@/lib/tutor-store'
import { useAuth } from '@/lib/auth-context'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/lessons/new', label: 'Log lesson', icon: NotebookPen },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/lessons/new') return pathname.startsWith('/lessons')
  return pathname.startsWith(href)
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sigma className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight">TutorTrack</span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { loading, loadError, reload } = useTutorStore()
  const { user, error: authError, logout } = useAuth()

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                  active && 'bg-sidebar-accent text-foreground',
                )}
              >
                <Icon className={cn('size-4', active && 'text-primary')} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto space-y-3 px-3 text-xs text-muted-foreground">
          <p className="truncate" title={user?.email}>{user?.email}</p>
          <button type="button" onClick={() => void logout()} className="flex items-center gap-2 text-sm hover:text-foreground">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
          <Logo />
          <button type="button" onClick={() => void logout()} aria-label="Sign out" className="ml-auto rounded-md p-2 text-muted-foreground hover:text-foreground">
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </header>

        <main className="flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-12">
          <div className="mx-auto w-full max-w-6xl">
            {loading && <p role="status" className="mb-4 text-sm text-muted-foreground">Loading students and lessons…</p>}
            {authError && <p role="alert" className="mb-4 text-sm text-destructive">{authError}</p>}
            {loadError && (
              <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-card p-3 text-sm">
                <span>Could not load your data: {loadError}</span>
                <button type="button" onClick={reload} className="font-medium text-primary underline">Retry</button>
              </div>
            )}
            {children}
          </div>
        </main>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground',
                  active && 'text-primary',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
