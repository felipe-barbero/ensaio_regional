import { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { MealPage } from '@/components/meal-page'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useCatalog } from '@/hooks/use-quantities'

export default function App() {
  const {
    catalog,
    loading,
    syncing,
    saving,
    lastSyncedAt,
    error,
    refresh,
    setEnteredMany,
  } = useCatalog()

  const handleRefresh = useCallback(() => {
    void refresh(true)
  }, [refresh])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <SidebarTrigger className="size-11 touch-manipulation md:size-8" />
          <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
          <span className="truncate text-sm font-medium">
            Ensaio Regional
          </span>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/cafe" replace />} />
          <Route
            path="/cafe"
            element={
              <MealPage
                meal="Cafe"
                items={catalog.Cafe.items}
                quantities={catalog.Cafe.quantities}
                loading={loading}
                syncing={syncing}
                saving={saving}
                lastSyncedAt={lastSyncedAt}
                error={error}
                onRefresh={handleRefresh}
                onSaveMany={setEnteredMany}
              />
            }
          />
          <Route
            path="/almoco"
            element={
              <MealPage
                meal="Almoco"
                items={catalog.Almoco.items}
                quantities={catalog.Almoco.quantities}
                loading={loading}
                syncing={syncing}
                saving={saving}
                lastSyncedAt={lastSyncedAt}
                error={error}
                onRefresh={handleRefresh}
                onSaveMany={setEnteredMany}
              />
            }
          />
          <Route path="*" element={<Navigate to="/cafe" replace />} />
        </Routes>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
