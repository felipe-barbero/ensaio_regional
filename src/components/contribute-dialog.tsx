import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  CONGREGACOES,
  flavorStorageKey,
  formatLogLine,
  formatQty,
  getFlavorQty,
  getItemTotal,
  isIntegerUnit,
  parseUnit,
  type Congregacao,
  type Ingredient,
  type MealKey,
} from '@/data/ingredients'
import type { ContributePayload } from '@/lib/api'
import { cn } from '@/lib/utils'

type ContributeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal: MealKey
  item: Ingredient | null
  quantities: Record<string, string>
  disabled?: boolean
  onContribute: (payload: ContributePayload) => Promise<void> | void
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

export function ContributeDialog({
  open,
  onOpenChange,
  meal,
  item,
  quantities,
  disabled,
  onContribute,
}: ContributeDialogProps) {
  const [amount, setAmount] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [congregacao, setCongregacao] = useState<Congregacao>('Zimbros')
  const [sabor, setSabor] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !item) return
    setAmount('')
    setPessoa('')
    setCongregacao('Zimbros')
    setSabor(item.sabores?.[0] ?? '')
  }, [open, item])

  if (!item) return null

  const unit = parseUnit(item.qtdNecessaria)
  const integer = isIntegerUnit(unit)
  const unitLabel = unit || ''
  const total = getItemTotal(item, quantities)

  async function handleSubmit() {
    if (!item) return
    const current = item

    const add = parseContributeInput(amount, integer)
    if (add == null) {
      toast.error(
        integer
          ? `Informe um número inteiro maior que zero${unitLabel ? ` (${unitLabel})` : ''}`
          : `Informe a quantidade${unitLabel ? ` em ${unitLabel}` : ''} (maior que zero)`,
      )
      return
    }
    if (!pessoa.trim()) {
      toast.error('Informe o seu nome')
      return
    }
    if (current.sabores?.length && !sabor) {
      toast.error('Selecione o sabor')
      return
    }

    const updates: Record<string, string> = {}

    if (current.sabores?.length) {
      const currentFlavor = getFlavorQty(current, sabor, quantities)
      const nextFlavor = currentFlavor + add
      updates[flavorStorageKey(current.nome, sabor)] = formatQty(
        nextFlavor,
        unit,
        integer,
      )

      const flavorSumOthers = current.sabores.reduce((sum, s) => {
        if (s === sabor) return sum
        return sum + getFlavorQty(current, s, quantities)
      }, 0)
      const hasAnyFlavor = current.sabores.some(
        (s) => getFlavorQty(current, s, quantities) > 0,
      )
      const nextTotal = hasAnyFlavor
        ? flavorSumOthers + nextFlavor
        : total + add

      if (nextTotal < total || nextFlavor < currentFlavor) {
        toast.error('Não é permitido diminuir a quantidade já registrada')
        return
      }
      updates[current.nome] = formatQty(nextTotal, unit, integer)
    } else {
      const next = total + add
      if (next < total) {
        toast.error('Não é permitido diminuir a quantidade já registrada')
        return
      }
      updates[current.nome] = formatQty(next, unit, integer)
    }

    const logLine = formatLogLine(
      pessoa.trim(),
      congregacao,
      add,
      unit,
      integer,
    )

    setBusy(true)
    try {
      await onContribute({
        sheet: meal,
        nome: current.nome,
        logLine,
        updates,
      })
      toast.success('Contribuição registrada')
      onOpenChange(false)
    } catch {
      // erro no hook
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribuir — {item.nome}</DialogTitle>
          <DialogDescription>
            Já entrou: {formatQty(total, unit, integer)} · Necessário:{' '}
            {item.qtdNecessaria || '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="contrib-nome">Seu nome</Label>
            <Input
              id="contrib-nome"
              value={pessoa}
              disabled={disabled || busy}
              placeholder="Ex.: Felipe"
              className="h-11 text-base"
              autoComplete="name"
              onChange={(e) => setPessoa(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Qual a sua comum congregação?</Label>
            <RadioGroup
              value={congregacao}
              onValueChange={(v) => setCongregacao(v as Congregacao)}
              className="grid gap-2"
              disabled={disabled || busy}
            >
              {CONGREGACOES.map((option) => {
                const id = `cong-${option}`
                return (
                  <label
                    key={option}
                    htmlFor={id}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 touch-manipulation',
                      congregacao === option && 'border-primary bg-primary/5',
                    )}
                  >
                    <RadioGroupItem value={option} id={id} />
                    <span className="text-sm font-medium">{option}</span>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {item.sabores?.length ? (
            <div className="space-y-2">
              <Label>Sabor</Label>
              <RadioGroup
                value={sabor}
                onValueChange={setSabor}
                className="grid gap-2"
                disabled={disabled || busy}
              >
                {item.sabores.map((option) => {
                  const id = `sabor-${option}`
                  return (
                    <label
                      key={option}
                      htmlFor={id}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 touch-manipulation',
                        sabor === option && 'border-primary bg-primary/5',
                      )}
                    >
                      <RadioGroupItem value={option} id={id} />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  )
                })}
              </RadioGroup>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="contrib-qtd">
              Quantidade ({unitLabel || 'qtd'})
            </Label>
            <div className="relative">
              <Input
                id="contrib-qtd"
                value={amount}
                disabled={disabled || busy}
                inputMode={integer ? 'numeric' : 'decimal'}
                placeholder={integer ? '0' : '0.0'}
                className="h-11 pr-14 text-base tabular-nums"
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
                    void handleSubmit()
                  }
                }}
              />
              {unitLabel ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  {unitLabel === 'pc' ? 'pct' : unitLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={disabled || busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? 'Salvando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
