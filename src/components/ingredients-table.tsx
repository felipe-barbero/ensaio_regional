import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ContributeForm } from '@/components/contribute-form'
import {
  formatQty,
  getItemTotal,
  isIntegerUnit,
  parseRequiredQty,
  parseUnit,
  type Ingredient,
  type MealKey,
} from '@/data/ingredients'
import { cn } from '@/lib/utils'

type IngredientsTableProps = {
  meal: MealKey
  items: Ingredient[]
  quantities: Record<string, string>
  disabled?: boolean
  onSaveMany: (
    meal: MealKey,
    updates: Record<string, string>,
  ) => Promise<void> | void
}

function StatusBadge({
  item,
  total,
}: {
  item: Ingredient
  total: number
}) {
  const required = parseRequiredQty(item.qtdNecessaria)
  const unit = parseUnit(item.qtdNecessaria)
  const integer = isIntegerUnit(unit)

  if (total <= 0) {
    return <Badge variant="outline">Pendente</Badge>
  }

  if (required == null) {
    return <Badge variant="secondary">Registrado</Badge>
  }

  if (total >= required) {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        Completo
      </Badge>
    )
  }

  const missing = required - total
  return (
    <Badge variant="destructive">
      Falta {formatQty(missing, unit, integer)}
    </Badge>
  )
}

function IngredientCard({
  meal,
  item,
  quantities,
  disabled,
  onSaveMany,
}: {
  meal: MealKey
  item: Ingredient
  quantities: Record<string, string>
  disabled?: boolean
  onSaveMany: (
    meal: MealKey,
    updates: Record<string, string>,
  ) => Promise<void> | void
}) {
  const total = getItemTotal(item, quantities)
  const required = parseRequiredQty(item.qtdNecessaria)
  const incomplete = required != null && total < required

  return (
    <article
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        incomplete && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{item.nome}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Necessário:{' '}
            <span className="font-medium text-foreground">
              {item.qtdNecessaria || '—'}
            </span>
          </p>
        </div>
        <StatusBadge item={item} total={total} />
      </div>

      <ContributeForm
        meal={meal}
        item={item}
        quantities={quantities}
        disabled={disabled}
        onSaveMany={onSaveMany}
      />
    </article>
  )
}

export function IngredientsTable({
  meal,
  items,
  quantities,
  disabled,
  onSaveMany,
}: IngredientsTableProps) {
  const editableItems = items.filter((item) => item.editavel !== false)

  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {editableItems.map((item) => (
          <IngredientCard
            key={item.nome}
            meal={meal}
            item={item}
            quantities={quantities}
            disabled={disabled}
            onSaveMany={onSaveMany}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-36">Nome</TableHead>
              <TableHead className="min-w-28">Qtd necessária</TableHead>
              <TableHead className="min-w-[22rem]">Contribuir</TableHead>
              <TableHead className="w-36">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableItems.map((item) => {
              const total = getItemTotal(item, quantities)
              const required = parseRequiredQty(item.qtdNecessaria)
              const incomplete = required != null && total < required

              return (
                <TableRow
                  key={item.nome}
                  className={cn(incomplete && 'bg-destructive/5')}
                >
                  <TableCell className="align-top font-medium">
                    {item.nome}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {item.qtdNecessaria || '—'}
                  </TableCell>
                  <TableCell className="align-top py-3">
                    <ContributeForm
                      meal={meal}
                      item={item}
                      quantities={quantities}
                      disabled={disabled}
                      compact
                      onSaveMany={onSaveMany}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusBadge item={item} total={total} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
