import { Link, useLocation } from 'react-router-dom'

import { ensaioNavItems } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'

export function MobileBottomNav({ slug }: { slug: string }) {
  const location = useLocation()
  const tabs = ensaioNavItems(slug)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="grid h-16 grid-cols-3">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex touch-manipulation flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground active:text-foreground',
              )}
            >
              <tab.icon
                className={cn('size-5', active && 'stroke-[2.5]')}
                aria-hidden
              />
              <span>{tab.short}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
