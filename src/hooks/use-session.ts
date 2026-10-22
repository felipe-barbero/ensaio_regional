import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { requireSupabase } from '@/lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = requireSupabase()
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, senha: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    if (error) throw new Error('E-mail ou senha inválidos')
  }, [])

  const signOut = useCallback(async () => {
    await requireSupabase().auth.signOut()
  }, [])

  return { session, loading, signIn, signOut }
}
