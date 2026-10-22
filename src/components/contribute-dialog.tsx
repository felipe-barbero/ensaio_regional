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
  formatNecessario,
  formatQty,
  isIntegerUnit,
  itemTotal,
  parseQuantidadeInput,
  type Contribuicao,
  type ContribuirInput,
  type Igreja,
  type Item,
} from '@/data/ensaio'
import { cn } from '@/lib/utils'

type ContributeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Item | null
  contribuicoes: Contribuicao[]
  igrejas: Igreja[]
  disabled?: boolean
  onContribute: (input: ContribuirInput) => Promise<void>
}

export function ContributeDialog({
  open,
  onOpenChange,
  item,
  contribuicoes,
  igrejas,
  disabled,
  onContribute,
}: ContributeDialogProps) {
  const [amount, setAmount] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [igrejaId, setIgrejaId] = useState('')
  const [sabor, setSabor] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !item) return
    setAmount('')
    setPessoa('')
    setIgrejaId('')
    setSabor(item.sabores[0] ?? '')
  }, [open, item])

  if (!item) return null

  const unitLabel = item.unidade
  const integer = isIntegerUnit(item.unidade)
  const total = itemTotal(item, contribuicoes)

  async function handleSubmit() {
    if (!item) return
    const current = item

    const quantidade = parseQuantidadeInput(amount, current.unidade)
    if (quantidade == null) {
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
    if (!igrejaId) {
      toast.error('Selecione a sua comum congregação')
      return
    }
    if (current.sabores.length > 0 && !sabor) {
      toast.error('Selecione o sabor')
      return
    }

    setBusy(true)
    try {
      await onContribute({
        itemId: current.id,
        igrejaId,
        pessoa: pessoa.trim(),
        sabor: current.sabores.length > 0 ? sabor : null,
        quantidade,
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
            Já entrou: {formatQty(total, item.unidade)} · Necessário:{' '}
            {formatNecessario(item)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="contrib-nome">Seu nome</Label>
            <Input
              id="contrib-nome"
              value={pessoa}
              disabled={disabled || busy}
              placeholder="João"
              maxLength={80}
              className="h-11 text-base"
              autoComplete="name"
              onChange={(e) => setPessoa(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Qual a sua comum congregação?</Label>
            <RadioGroup
              value={igrejaId || undefined}
              onValueChange={setIgrejaId}
              className="grid gap-2"
              disabled={disabled || busy}
            >
              {igrejas.map((option) => {
                const id = `cong-${option.id}`
                return (
                  <label
                    key={option.id}
                    htmlFor={id}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 touch-manipulation',
                      igrejaId === option.id && 'border-primary bg-primary/5',
                    )}
                  >
                    <RadioGroupItem value={option.id} id={id} />
                    <span className="text-sm font-medium">{option.nome}</span>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {item.sabores.length > 0 ? (
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
                  {unitLabel}
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
