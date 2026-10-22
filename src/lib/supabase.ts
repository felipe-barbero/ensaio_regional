import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim()

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export function isSupabaseConfigured(): boolean {
  return supabase != null
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
    )
  }
  return supabase
}
