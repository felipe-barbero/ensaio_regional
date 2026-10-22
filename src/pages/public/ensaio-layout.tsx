import { Loader2 } from 'lucide-react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import type { EnsaioPublico } from '@/data/ensaio'
import { useEnsaio, type UseEnsaio } from '@/hooks/use-ensaio'
import { formatData } from '@/lib/format'
import { NotFoundPage } from '@/pages/public/not-found-page'

export type EnsaioContext = UseEnsaio & { data: EnsaioPublico }

export function useEnsaioContext(): EnsaioContext {
  return useOutletContext<EnsaioContext>()
}

export function EnsaioLayout() {
  const { slug = '' } = useParams()
  const state = useEnsaio(slug)
  const { data, notFound } = state

  if (notFound) {
    return <NotFoundPage message="Ensaio não encontrado." />
  }

  if (!data) {
    return (
      <div
        className="flex min-h-svh flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-10 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">
          {state.error ?? 'Carregando ensaio…'}
        </p>
      </div>
    )
  }

  const { ensaio } = data
  const encerrado = ensaio.status === 'encerrado'

  return (
    <SidebarProvider>
      <AppSidebar ensaio={ensaio} />
      <SidebarInset className="min-h-svh">
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <SidebarTrigger className="size-11 touch-manipulation md:size-8" />
          <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
          <span className="truncate text-sm font-medium">
            {ensaio.nome} · {formatData(ensaio.data)}
          </span>
        </header>
        {encerrado ? (
          <div className="border-b bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Ensaio encerrado — contribuições não são mais aceitas.
          </div>
        ) : null}
        <Outlet context={{ ...state, data } satisfies EnsaioContext} />
        <MobileBottomNav slug={ensaio.slug} />
      </SidebarInset>
    </SidebarProvider>
  )
}
