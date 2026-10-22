import { TriangleAlert } from 'lucide-react'

export function ConfigError() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert className="size-10 text-destructive" />
      <h1 className="text-xl font-semibold tracking-tight">
        App não configurado
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Defina <code>VITE_SUPABASE_URL</code> e{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>.
      </p>
    </div>
  )
}
