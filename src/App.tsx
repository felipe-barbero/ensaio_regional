import { useCallback } from 'react'
import { Route, Routes } from 'react-router-dom'

import { DashboardPage } from '@/components/dashboard-page'
import { MealPage } from '@/components/meal-page'
import type { MealKey } from '@/data/ensaio'
import { isSupabaseConfigured } from '@/lib/supabase'
import { AdminLayout } from '@/pages/admin/admin-layout'
import { EnsaioNewPage } from '@/pages/admin/ensaio-new-page'
import { EnsaiosListPage } from '@/pages/admin/ensaios-list-page'
import { LoginPage } from '@/pages/admin/login-page'
import { RegioesPage } from '@/pages/admin/regioes-page'
import { RequireAdmin } from '@/pages/admin/require-admin'
import { ConfigError } from '@/pages/public/config-error'
import {
  EnsaioLayout,
  useEnsaioContext,
} from '@/pages/public/ensaio-layout'
import { HomePage } from '@/pages/public/home-page'
import { NotFoundPage } from '@/pages/public/not-found-page'

function EmConstrucao() {
  return <p className="text-sm text-muted-foreground">Em construção.</p>
}

function EnsaioResumo() {
  const { data } = useEnsaioContext()
  return <DashboardPage data={data} />
}

function EnsaioRefeicao({ meal }: { meal: MealKey }) {
  const ctx = useEnsaioContext()
  const { refresh } = ctx

  const handleRefresh = useCallback(() => {
    void refresh(true)
  }, [refresh])

  return (
    <MealPage
      meal={meal}
      data={ctx.data}
      encerrado={ctx.data.ensaio.status === 'encerrado'}
      loading={ctx.loading}
      syncing={ctx.syncing}
      saving={ctx.saving}
      lastSyncedAt={ctx.lastSyncedAt}
      error={ctx.error}
      onRefresh={handleRefresh}
      onContribute={ctx.contribuir}
    />
  )
}

export default function App() {
  if (!isSupabaseConfigured()) return <ConfigError />

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/e/:slug" element={<EnsaioLayout />}>
        <Route index element={<EnsaioResumo />} />
        <Route path="cafe" element={<EnsaioRefeicao meal="cafe" />} />
        <Route path="almoco" element={<EnsaioRefeicao meal="almoco" />} />
      </Route>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<EnsaiosListPage />} />
          <Route path="ensaios/novo" element={<EnsaioNewPage />} />
          <Route path="ensaios/:id" element={<EmConstrucao />} />
          <Route path="regioes" element={<RegioesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
