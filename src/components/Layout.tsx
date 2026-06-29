import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { IconSlot } from './IconSlot'

const NAV = [
  { to: '/', label: 'Vocabulary' },
  { to: '/practice', label: 'Practice' },
] as const

export function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line/70 bg-surface/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <IconSlot label="logo" size={28} />
            <span className="text-xl font-extrabold tracking-tight">
              memords
            </span>
          </Link>

          <div className="flex items-center gap-1 rounded-full bg-page/70 p-1">
            {NAV.map((item) => {
              const active = pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <IconSlot label="bell" size={22} />
            <IconSlot label="avatar" size={36} className="rounded-full" />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
