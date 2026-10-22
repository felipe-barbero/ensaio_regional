import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmButton } from '@/components/confirm-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatNecessario,
  MEAL_LABELS,
  parseQuantidadeInput,
  parseSaboresInput,
  UNITS,
  type Item,
  type MealKey,
  type Unit,
} from '@/data/ensaio'
import {
  atualizarItem,
  criarItem,
  excluirItem,
  reordenarItens,
  type ItemInput,
} from '@/lib/admin-api'
import type { EnsaioAdminData } from '@/pages/admin/ensaio-detail-page'

// Radix Select não aceita value vazio
const SEM_UNIDADE = 'sem'

type Editing = { refeicao: MealKey; item: Item | null }

function ItemDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Editing | null
  onClose: () => void
  onSave: (input: ItemInput) => Promise<void>
}) {
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState('')
  const [unidade, setUnidade] = useState<Unit>('un')
  const [sabores, setSabores] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) return
    const item = editing.item
    setNome(item?.nome ?? '')
    setQtd(item?.qtdNecessaria != null ? String(item.qtdNecessaria) : '')
    setUnidade(item?.unidade ?? 'un')
    setSabores(item?.sabores.join(', ') ?? '')
  }, [editing])

  async function handleSave() {
    if (!editing) return
    if (!nome.trim()) {
      toast.error('Informe o nome do item')
      return
    }
    let qtdNecessaria: number | null = null
    if (qtd.trim()) {
      qtdNecessaria = parseQuantidadeInput(qtd, unidade)
      if (qtdNecessaria == null) {
        toast.error('Quantidade necessária inválida para a unidade')
        return
      }
    }
    setBusy(true)
    try {
      await onSave({
        refeicao: editing.refeicao,
        nome,
        qtdNecessaria,
        unidade,
        sabores: parseSaboresInput(sabores),
      })
      onClose()
    } catch {
      // toast já exibido; mantém o diálogo aberto para corrigir
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={editing != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing?.item ? 'Editar item' : 'Novo item'} ·{' '}
            {editing ? MEAL_LABELS[editing.refeicao] : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-nome">Nome</Label>
            <Input
              id="item-nome"
              value={nome}
              className="h-11"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-qtd">Quantidade necessária</Label>
              <Input
                id="item-qtd"
                value={qtd}
                inputMode="decimal"
                placeholder="opcional"
                className="h-11"
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select
                value={unidade || SEM_UNIDADE}
                onValueChange={(v) => setUnidade(v === SEM_UNIDADE ? '' : (v as Unit))}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u || SEM_UNIDADE} value={u || SEM_UNIDADE}>
                      {u || 'sem unidade'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-sabores">Sabores</Label>
            <Input
              id="item-sabores"
              value={sabores}
              placeholder="opcional — ex.: Chocolate, Cenoura"
              className="h-11"
              onChange={(e) => setSabores(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => void handleSave()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ItensTab({
  data,
  onChanged,
}: {
  data: EnsaioAdminData
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState<Editing | null>(null)

  async function act(acao: () => Promise<unknown>, ok?: string) {
    try {
      await acao()
      if (ok) toast.success(ok)
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
      throw err
    }
  }

  async function mover(itens: Item[], index: number, delta: -1 | 1) {
    const ids = itens.map((i) => i.id)
    const alvo = index + delta
    ;[ids[index], ids[alvo]] = [ids[alvo], ids[index]]
    await act(() => reordenarItens(ids)).catch(() => undefined)
  }

  async function save(input: ItemInput) {
    const item = editing?.item
    await act(
      () => (item ? atualizarItem(item.id, input) : criarItem(data.ensaio.id, input)),
      item ? 'Item atualizado' : 'Item adicionado',
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(['cafe', 'almoco'] as MealKey[]).map((meal) => {
        const itens = data.itens.filter((i) => i.refeicao === meal)
        return (
          <Card key={meal}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{MEAL_LABELS[meal]}</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing({ refeicao: meal, item: null })}
              >
                <Plus className="size-4" />
                Item
              </Button>
            </CardHeader>
            <CardContent>
              {itens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {itens.map((item, index) => (
                    <li key={item.id} className="flex items-center gap-1 px-2 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatNecessario(item)}
                          {item.sabores.length > 0
                            ? ` · ${item.sabores.join(', ')}`
                            : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Subir"
                        disabled={index === 0}
                        onClick={() => void mover(itens, index, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Descer"
                        disabled={index === itens.length - 1}
                        onClick={() => void mover(itens, index, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Editar ${item.nome}`}
                        onClick={() => setEditing({ refeicao: meal, item })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmButton
                        title={`Excluir ${item.nome}?`}
                        description="As contribuições deste item também serão apagadas."
                        onConfirm={() =>
                          void act(() => excluirItem(item.id), 'Item excluído').catch(
                            () => undefined,
                          )
                        }
                      >
                        <Button size="icon" variant="ghost" aria-label={`Excluir ${item.nome}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </ConfirmButton>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}

      <ItemDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </div>
  )
}
