import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'

import { ContributeDialog } from '@/components/contribute-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatQty,
  getItemTotal,
  isIntegerUnit,
  parseRequiredQty,
  parseUnit,
  type Ingredient,
  type MealKey,
} from '@/data/ingredients'
import type { ContributePayload } from '@/lib/api'
import { cn } from '@/lib/utils'

type IngredientsTableProps = {
  meal: MealKey
  items: Ingredient[]
  quantities: Record<string, string>
  disabled?: boolean
  onContribute: (payload: ContributePayload) => Promise<void> | void
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

  if (total <= 0) return <Badge variant="outline">Pendente</Badge>
  if (required == null) return <Badge variant="secondary">Registrado</Badge>
  if (total >= required) {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        Completo
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">
      Falta {formatQty(required - total, unit, integer)}
    </Badge>
  )
}

function IngredientCard({
  item,
  quantities,
  disabled,
  onContributeClick,
}: {
  item: Ingredient
  quantities: Record<string, string>
  disabled?: boolean
  onContributeClick: (item: Ingredient) => void
}) {
  const total = getItemTotal(item, quantities)
  const unit = parseUnit(item.qtdNecessaria)
  const integer = isIntegerUnit(unit)
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
          <p className="mt-0.5 text-sm text-muted-foreground">
            Já entrou:{' '}
            <span className="font-medium text-foreground">
              {formatQty(total, unit, integer)}
            </span>
          </p>
        </div>
        <StatusBadge item={item} total={total} />
      </div>

      <Button
        type="button"
        className="h-11 w-full touch-manipulation"
        disabled={disabled}
        onClick={() => onContributeClick(item)}
      >
        <Plus className="size-4" />
        Contribuir
      </Button>
    </article>
  )
}

export function IngredientsTable({
  meal,
  items,
  quantities,
  disabled,
  onContribute,
}: IngredientsTableProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Ingredient | null>(null)
  const [open, setOpen] = useState(false)

  const editableItems = items.filter((item) => item.editavel !== false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return editableItems
    return editableItems.filter((item) => item.nome.toLowerCase().includes(q))
  }, [editableItems, search])

  function openContribute(item: Ingredient) {
    setSelected(item)
    setOpen(true)
  }

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ingrediente…"
          className="h-11 pl-9 text-base"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum ingrediente encontrado.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((item) => (
              <IngredientCard
                key={item.nome}
                item={item}
                quantities={quantities}
                disabled={disabled}
                onContributeClick={openContribute}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Qtd necessária</TableHead>
                  <TableHead>Já entrou</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const total = getItemTotal(item, quantities)
                  const unit = parseUnit(item.qtdNecessaria)
                  const integer = isIntegerUnit(unit)
                  const required = parseRequiredQty(item.qtdNecessaria)
                  const incomplete = required != null && total < required

                  return (
                    <TableRow
                      key={item.nome}
                      className={cn(incomplete && 'bg-destructive/5')}
                    >
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.qtdNecessaria || '—'}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatQty(total, unit, integer)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge item={item} total={total} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={disabled}
                          onClick={() => openContribute(item)}
                        >
                          <Plus className="size-4" />
                          Contribuir
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ContributeDialog
        open={open}
        onOpenChange={setOpen}
        meal={meal}
        item={selected}
        quantities={quantities}
        disabled={disabled}
        onContribute={onContribute}
      />
    </>
  )
}
