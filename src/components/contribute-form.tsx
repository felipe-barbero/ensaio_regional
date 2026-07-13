import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  flavorStorageKey,
  formatQty,
  getFlavorQty,
  getItemTotal,
  isIntegerUnit,
  parseUnit,
  type Ingredient,
  type MealKey,
} from '@/data/ingredients'
import { cn } from '@/lib/utils'

type ContributeFormProps = {
  meal: MealKey
  item: Ingredient
  quantities: Record<string, string>
  disabled?: boolean
  compact?: boolean
  onSaveMany: (
    meal: MealKey,
    updates: Record<string, string>,
  ) => Promise<void> | void
}

function parseContributeInput(raw: string, integer: boolean): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  if (integer) {
    if (!Number.isInteger(value)) return null
    return value
  }
  return Math.round(value * 1000) / 1000
}

export function ContributeForm({
  meal,
  item,
  quantities,
  disabled,
  compact,
  onSaveMany,
}: ContributeFormProps) {
  const unit = parseUnit(item.qtdNecessaria)
  const integer = isIntegerUnit(unit)
  const [amount, setAmount] = useState('')
  const [sabor, setSabor] = useState(item.sabores?.[0] ?? '')
  const [busy, setBusy] = useState(false)

  const total = getItemTotal(item, quantities)
  const unitLabel = unit || ''

  async function handleContribute() {
    const add = parseContributeInput(amount, integer)
    if (add == null) {
      toast.error(
        integer
          ? `Informe um número inteiro maior que zero${unitLabel ? ` (${unitLabel})` : ''}`
          : `Informe a quantidade em ${unitLabel || 'número'} (maior que zero)`,
      )
      return
    }

    if (item.sabores?.length && !sabor) {
      toast.error('Selecione o sabor')
      return
    }

    setBusy(true)
    try {
      const updates: Record<string, string> = {}

      if (item.sabores?.length) {
        const currentFlavor = getFlavorQty(item, sabor, quantities)
        const nextFlavor = currentFlavor + add
        updates[flavorStorageKey(item.nome, sabor)] = formatQty(
          nextFlavor,
          unit,
          integer,
        )

        const flavorSumOthers = item.sabores.reduce((sum, s) => {
          if (s === sabor) return sum
          return sum + getFlavorQty(item, s, quantities)
        }, 0)
        const hasAnyFlavor = item.sabores.some(
          (s) => getFlavorQty(item, s, quantities) > 0,
        )
        // Se só existia total legado (sem sabores), soma em cima dele
        const base = hasAnyFlavor ? flavorSumOthers + currentFlavor : total
        const nextTotal = hasAnyFlavor
          ? flavorSumOthers + nextFlavor
          : base + add

        if (nextTotal < total || nextFlavor < currentFlavor) {
          toast.error('Não é permitido diminuir a quantidade já registrada')
          return
        }

        updates[item.nome] = formatQty(nextTotal, unit, integer)
      } else {
        const next = total + add
        if (next < total) {
          toast.error('Não é permitido diminuir a quantidade já registrada')
          return
        }
        updates[item.nome] = formatQty(next, unit, integer)
      }

      await onSaveMany(meal, updates)
      setAmount('')
      toast.success('Contribuição registrada')
    } catch {
      // erro já notificado no hook
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', compact && 'gap-2')}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-muted-foreground">Já entrou:</span>
        <span className="font-semibold tabular-nums">
          {formatQty(total, unit, integer)}
        </span>
      </div>

      {item.sabores?.length ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sabor</Label>
          <RadioGroup
            value={sabor}
            onValueChange={setSabor}
            className="grid gap-2"
            disabled={disabled || busy}
          >
            {item.sabores.map((option) => {
              const qty = getFlavorQty(item, option, quantities)
              const id = `${item.nome}-${option}`.replace(/\s+/g, '-')
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 touch-manipulation',
                    sabor === option && 'border-primary bg-primary/5',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value={option} id={id} />
                    <span className="text-sm font-medium">{option}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatQty(qty, unit, integer)}
                  </span>
                </label>
              )
            })}
          </RadioGroup>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label
            htmlFor={`add-${item.nome}`}
            className="text-xs text-muted-foreground"
          >
            Adicionar ({unitLabel || 'qtd'})
          </Label>
          <div className="relative">
            <Input
              id={`add-${item.nome}`}
              value={amount}
              disabled={disabled || busy}
              inputMode={integer ? 'numeric' : 'decimal'}
              enterKeyHint="done"
              placeholder={integer ? '0' : '0.0'}
              className="h-11 pr-12 touch-manipulation text-base tabular-nums md:h-9 md:text-sm"
              onChange={(e) => {
                const next = e.target.value
                if (integer) {
                  if (next === '' || /^\d+$/.test(next)) setAmount(next)
                  return
                }
                if (next === '' || /^\d*[.,]?\d*$/.test(next)) setAmount(next)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleContribute()
                }
              }}
            />
            {unitLabel ? (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                {unitLabel}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          className="h-11 w-full touch-manipulation sm:w-auto md:h-9"
          disabled={disabled || busy || !amount.trim()}
          onClick={() => void handleContribute()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {busy ? 'Salvando…' : 'Contribuir'}
        </Button>
      </div>
    </div>
  )
}
