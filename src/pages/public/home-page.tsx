import { Link2 } from 'lucide-react'

export function HomePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <Link2 className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold tracking-tight">Ensaio Regional</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Acesse pelo link do seu ensaio.
      </p>
    </div>
  )
}
