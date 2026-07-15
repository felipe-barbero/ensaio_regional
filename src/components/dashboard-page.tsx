import { Link } from 'react-router-dom'
import { Coffee, LayoutDashboard, UtensilsCrossed } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatContributionPhrase,
  formatQty,
  getItemTotal,
  isIntegerUnit,
  mealProgress,
  MEAL_LABELS,
  parseRequiredQty,
  parseUnit,
  type CatalogMap,
  type ContributionEntry,
  type MealKey,
} from '@/data/ingredients'

type DashboardPageProps = {
  catalog: CatalogMap
}

function MealSummaryCard({
  meal,
  catalog,
}: {
  meal: MealKey
  catalog: CatalogMap
}) {
  const { items, quantities } = catalog[meal]
  const progress = mealProgress(items, quantities)
  const rows = items
    .filter((item) => item.editavel !== false)
    .map((item) => {
      const required = parseRequiredQty(item.qtdNecessaria)
      const got = getItemTotal(item, quantities)
      const unit = parseUnit(item.qtdNecessaria)
      const integer = isIntegerUnit(unit)
      const complete = required != null ? got >= required : got > 0
      const falta =
        required != null && got < required
          ? formatQty(required - got, unit, integer)
          : null

      return {
        nome: item.nome,
        necessario: item.qtdNecessaria || '—',
        entrou: formatQty(got, unit, integer),
        falta,
        complete,
      }
    })

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {meal === 'Cafe' ? (
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
              key={row.nome}
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
        <p className="text-sm text-muted-foreground">Nenhum item nesta aba.</p>
      )}

      <Button asChild variant="outline" className="mt-4 w-full">
        <Link to={meal === 'Cafe' ? '/cafe' : '/almoco'}>Ver lista</Link>
      </Button>
    </section>
  )
}

function latestContributions(catalog: CatalogMap, limit = 20): ContributionEntry[] {
  const all = [
    ...catalog.Cafe.contributions,
    ...catalog.Almoco.contributions,
  ]
  // Coluna D é append — últimos no final
  return all.slice().reverse().slice(0, limit)
}

export function DashboardPage({ catalog }: DashboardPageProps) {
  const recent = latestContributions(catalog)

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
        <MealSummaryCard meal="Cafe" catalog={catalog} />
        <MealSummaryCard meal="Almoco" catalog={catalog} />
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Últimas contribuições</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma contribuição registrada ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {recent.map((entry, index) => (
              <li
                key={`${entry.pessoa}-${entry.ingredientNome}-${entry.qtdLabel}-${index}`}
                className="border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0"
              >
                {formatContributionPhrase(entry)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
