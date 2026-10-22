import { Link } from 'react-router-dom'
import { Coffee, LayoutDashboard, UtensilsCrossed } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatContributionPhrase,
  formatNecessario,
  formatQty,
  isItemCompleto,
  itemFalta,
  itemTotal,
  mealProgress,
  MEAL_LABELS,
  type EnsaioPublico,
  type MealKey,
} from '@/data/ensaio'

type DashboardPageProps = {
  data: EnsaioPublico
}

function MealSummaryCard({
  meal,
  data,
}: {
  meal: MealKey
  data: EnsaioPublico
}) {
  const items = data.itens.filter((i) => i.refeicao === meal)
  const { contribuicoes } = data
  const progress = mealProgress(items, contribuicoes)
  const rows = items.map((item) => {
    const falta = itemFalta(item, contribuicoes)
    return {
      id: item.id,
      nome: item.nome,
      necessario: formatNecessario(item),
      entrou: formatQty(itemTotal(item, contribuicoes), item.unidade),
      falta: falta ? formatQty(falta, item.unidade) : null,
      complete: isItemCompleto(item, contribuicoes),
    }
  })

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {meal === 'cafe' ? (
            <Coffee className="size-5" />
          ) : (
            <UtensilsCrossed className="size-5" />
          )}
          <h2 className="text-lg font-semibold">{MEAL_LABELS[meal]}</h2>
        </div>
        <Badge
          className={
            progress.pct >= 100
              ? 'bg-emerald-600 text-white hover:bg-emerald-600'
              : undefined
          }
          variant={progress.pct >= 100 ? 'default' : 'secondary'}
        >
          {progress.pct}%
        </Badge>
      </div>

      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">
          {progress.complete} de {progress.total} completos
        </span>
        <span className="text-muted-foreground">
          {progress.missingCount} faltando
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width]"
          style={{ width: `${progress.pct}%` }}
        />
      </div>

      {rows.length > 0 ? (
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium leading-tight">{row.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Necessário {row.necessario} · Entrou {row.entrou}
                </p>
              </div>
              {row.complete ? (
                <Badge className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-600">
                  Completo
                </Badge>
              ) : (
                <span className="shrink-0 text-right text-xs font-medium tabular-nums text-destructive">
                  {row.falta ? `falta ${row.falta}` : 'Pendente'}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum item cadastrado nesta refeição.
        </p>
      )}

      <Button asChild variant="outline" className="mt-4 w-full">
        <Link to={`/e/${data.ensaio.slug}/${meal}`}>Ver lista</Link>
      </Button>
    </section>
  )
}

export function DashboardPage({ data }: DashboardPageProps) {
  const itemById = new Map(data.itens.map((i) => [i.id, i]))
  const recent = data.contribuicoes.slice(0, 20)

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 pb-24 sm:p-4 md:p-6 md:pb-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <LayoutDashboard className="size-5" />
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Resumo
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Progresso e últimas contribuições das congregações.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MealSummaryCard meal="cafe" data={data} />
        <MealSummaryCard meal="almoco" data={data} />
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Últimas contribuições</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma contribuição registrada ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {recent.map((entry) => {
              const item = itemById.get(entry.itemId)
              if (!item) return null
              return (
                <li
                  key={entry.id}
                  className="border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0"
                >
                  {formatContributionPhrase(entry, item)}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
