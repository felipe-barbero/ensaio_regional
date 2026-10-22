import { Loader2, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

import { IngredientsTable } from '@/components/ingredients-table'
import { Button } from '@/components/ui/button'
import {
  mealProgress,
  MEAL_LABELS,
  type Contribuicao,
  type ContribuirInput,
  type EnsaioPublico,
  type Item,
  type MealKey,
} from '@/data/ensaio'

type MealPageProps = {
  meal: MealKey
  data: EnsaioPublico
  encerrado: boolean
  loading: boolean
  syncing: boolean
  saving: boolean
  lastSyncedAt: Date | null
  error: string | null
  onRefresh: () => void
  onContribute: (input: ContribuirInput) => Promise<void>
}

function formatSynced(date: Date | null): string {
  if (!date) return 'ainda não sincronizado'
  return `às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`
}

function ProgressSummary({
  items,
  contribuicoes,
}: {
  items: Item[]
  contribuicoes: Contribuicao[]
}) {
  const progress = mealProgress(items, contribuicoes)

  return (
    <div className="rounded-xl border bg-muted/40 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {progress.complete} de {progress.total} completos
        </span>
        <span className="tabular-nums text-muted-foreground">
          {progress.pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  )
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-10 animate-spin text-foreground" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}

export function MealPage({
  meal,
  data,
  encerrado,
  loading,
  syncing,
  saving,
  lastSyncedAt,
  error,
  onRefresh,
  onContribute,
}: MealPageProps) {
  const items = data.itens.filter((i) => i.refeicao === meal)
  const showOverlay = !lastSyncedAt && (loading || syncing)

  useEffect(() => {
    onRefresh()
  }, [meal, onRefresh])

  return (
    <div className="relative flex min-h-[50vh] flex-1 flex-col gap-4 p-3 pb-24 sm:p-4 md:p-6 md:pb-6">
      {showOverlay ? (
        <LoadingOverlay message="Carregando ingredientes…" />
      ) : null}

      <div className="sticky top-14 z-20 -mx-3 space-y-3 border-b bg-background/95 px-3 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4 sm:px-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {MEAL_LABELS[meal]}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Sync {formatSynced(lastSyncedAt)}
              {saving ? ' · salvando…' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0 touch-manipulation md:size-9"
            onClick={() => onRefresh()}
            disabled={loading || syncing || saving}
            aria-label="Atualizar"
          >
            <RefreshCw
              className={
                loading || syncing ? 'size-5 animate-spin' : 'size-5'
              }
            />
          </Button>
        </div>

        <ProgressSummary items={items} contribuicoes={data.contribuicoes} />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!showOverlay && items.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum item cadastrado nesta refeição.
        </div>
      ) : (
        <IngredientsTable
          itens={items}
          contribuicoes={data.contribuicoes}
          igrejas={data.igrejas}
          disabled={loading || syncing || saving}
          encerrado={encerrado}
          onContribute={onContribute}
        />
      )}
    </div>
  )
}
