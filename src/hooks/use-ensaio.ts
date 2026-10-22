import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { ContribuirInput, EnsaioPublico } from '@/data/ensaio'
import { contribuir as contribuirApi, fetchEnsaio } from '@/lib/ensaio-api'

const POLL_MS = 30_000

export function useEnsaio(slug: string) {
  const [data, setData] = useState<EnsaioPublico | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refresh = useCallback(
    async (silent = false) => {
      const id = ++requestId.current
      setSyncing(true)
      if (!silent) setLoading(true)

      try {
        const result = await fetchEnsaio(slug)
        if (id !== requestId.current) return
        setData(result)
        setNotFound(result == null)
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
    },
    [slug],
  )

  useEffect(() => {
    setData(null)
    setNotFound(false)
    setLastSyncedAt(null)
    void refresh()
  }, [refresh])

  useEffect(() => {
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
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh(true)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  const contribuir = useCallback(
    async (input: ContribuirInput) => {
      try {
        setSaving(true)
        // Invalida respostas de sync em andamento: a RPC já devolve o ensaio atualizado
        ++requestId.current
        const result = await contribuirApi(slug, input)
        setData(result)
        setLastSyncedAt(new Date())
        setError(null)
        // O sync invalidado acima não vai limpar esses flags
        setLoading(false)
        setSyncing(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar'
        toast.error(message)
        await refresh(true)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [slug, refresh],
  )

  return {
    data,
    notFound,
    loading,
    syncing,
    saving,
    lastSyncedAt,
    error,
    refresh,
    contribuir,
  }
}

export type UseEnsaio = ReturnType<typeof useEnsaio>
