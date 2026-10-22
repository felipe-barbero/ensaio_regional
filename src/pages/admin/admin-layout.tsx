import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const links = [
  { to: '/admin', label: 'Ensaios', end: true },
  { to: '/admin/regioes', label: 'Regiões', end: false },
]

export function AdminLayout() {
  const { signOut } = useSession()

  return (
    <div className="flex min-h-svh flex-col">
      <header
        className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <span className="hidden text-sm font-semibold sm:inline">
          Admin · Ensaio Regional
        </span>
        <nav className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
