import { SearchX } from 'lucide-react'

export function NotFoundPage({
  message = 'Página não encontrada.',
}: {
  message?: string
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <SearchX className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold tracking-tight">{message}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Confira se o link do ensaio está completo.
      </p>
    </div>
  )
}
