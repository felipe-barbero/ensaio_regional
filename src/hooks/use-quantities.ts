import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  EMPTY_CATALOG,
  type CatalogMap,
} from '@/data/ingredients'
import {
  fetchCatalog,
  isApiConfigured,
  submitContribution,
  type ContributePayload,
} from '@/lib/api'

const POLL_MS = 30_000

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogMap>(EMPTY_CATALOG)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const configured = isApiConfigured()
  const requestId = useRef(0)

  const refresh = useCallback(async (silent = false) => {
    if (!isApiConfigured()) {
      setLoading(false)
      setSyncing(false)
      setError('API não configurada. Defina VITE_APPS_SCRIPT_URL no .env.')
      return
    }

    const id = ++requestId.current
    setSyncing(true)
    if (!silent) setLoading(true)

    try {
      const data = await fetchCatalog()
      if (id !== requestId.current) return
      setCatalog(data)
      setLastSyncedAt(new Date())
      setError(null)
    } catch (err) {
      if (id !== requestId.current) return
      const message =
        err instanceof Error ? err.message : 'Erro ao sincronizar'
      setError(message)
      if (!silent) toast.error(message)
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setSyncing(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!configured) return

    const syncNow = () => {
      if (document.visibilityState === 'visible') {
        void refresh(true)
      }
    }

    document.addEventListener('visibilitychange', syncNow)
    window.addEventListener('focus', syncNow)
    window.addEventListener('pageshow', syncNow)

    return () => {
      document.removeEventListener('visibilitychange', syncNow)
      window.removeEventListener('focus', syncNow)
      window.removeEventListener('pageshow', syncNow)
    }
  }, [configured, refresh])

  useEffect(() => {
    if (!configured) return
    const id = window.setInterval(() => {
      void refresh(true)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [configured, refresh])

  const contribute = useCallback(
    async (payload: ContributePayload) => {
      setCatalog((prev) => ({
        ...prev,
        [payload.sheet]: {
          ...prev[payload.sheet],
          quantities: {
            ...prev[payload.sheet].quantities,
            ...payload.updates,
          },
        },
      }))
      setLastSyncedAt(new Date())

      if (!isApiConfigured()) {
        toast.error('API não configurada')
        return
      }

      try {
        setSaving(true)
        const data = await submitContribution(payload)
        setCatalog(data)
        setLastSyncedAt(new Date())
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao salvar'
        toast.error(message)
        await refresh(true)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [refresh],
  )

  return {
    catalog,
    loading,
    syncing,
    saving,
    lastSyncedAt,
    error,
    configured,
    refresh,
    contribute,
  }
}

export const useQuantities = useCatalog
