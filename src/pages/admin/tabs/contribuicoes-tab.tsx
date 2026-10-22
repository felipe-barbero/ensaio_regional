import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmButton } from '@/components/confirm-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  formatQty,
  MEAL_LABELS,
  parseQuantidadeInput,
  type Contribuicao,
  type Item,
} from '@/data/ensaio'
import { atualizarContribuicao, excluirContribuicao } from '@/lib/admin-api'
import type { EnsaioAdminData } from '@/pages/admin/ensaio-detail-page'

// Radix Select não aceita value vazio
const TODOS = 'todos'
const NENHUMA = 'nenhuma'

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EditDialog({
  contrib,
  item,
  data,
  onClose,
  onSaved,
}: {
  contrib: Contribuicao | null
  item: Item | undefined
  data: EnsaioAdminData
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [pessoa, setPessoa] = useState('')
  const [igrejaId, setIgrejaId] = useState(NENHUMA)
  const [sabor, setSabor] = useState(NENHUMA)
  const [qtd, setQtd] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!contrib) return
    setPessoa(contrib.pessoa)
    setIgrejaId(contrib.igrejaId ?? NENHUMA)
    setSabor(contrib.sabor ?? NENHUMA)
    setQtd(String(contrib.quantidade))
  }, [contrib])

  if (!contrib || !item) return null

  const podeSemIgreja = contrib.origem === 'ajuste'
  const podeSemSabor = contrib.origem !== 'link' || item.sabores.length === 0

  async function handleSave() {
    if (!contrib || !item) return
    const quantidade = parseQuantidadeInput(qtd, item.unidade)
    if (quantidade == null) {
      toast.error('Quantidade inválida para a unidade do item')
      return
    }
    if (!pessoa.trim()) {
      toast.error('Informe o nome')
      return
    }
    if (igrejaId === NENHUMA && !podeSemIgreja) {
      toast.error('Selecione a igreja')
      return
    }
    if (sabor === NENHUMA && !podeSemSabor) {
      toast.error('Selecione o sabor')
      return
    }
    setBusy(true)
    try {
      await atualizarContribuicao(contrib.id, {
        pessoa,
        igrejaId: igrejaId === NENHUMA ? null : igrejaId,
        sabor: sabor === NENHUMA ? null : sabor,
        quantidade,
      })
      toast.success('Contribuição atualizada')
      onClose()
      await onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar contribuição · {item.nome}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-pessoa">Pessoa</Label>
            <Input
              id="edit-pessoa"
              value={pessoa}
              maxLength={80}
              className="h-11"
              onChange={(e) => setPessoa(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Igreja</Label>
            <Select value={igrejaId} onValueChange={setIgrejaId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {podeSemIgreja ? (
                  <SelectItem value={NENHUMA}>— (ajuste)</SelectItem>
                ) : null}
                {data.igrejas.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {item.sabores.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Sabor</Label>
              <Select value={sabor} onValueChange={setSabor}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {podeSemSabor ? (
                    <SelectItem value={NENHUMA}>não informado</SelectItem>
                  ) : null}
                  {item.sabores.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="edit-qtd">Quantidade ({item.unidade || 'qtd'})</Label>
            <Input
              id="edit-qtd"
              value={qtd}
              inputMode="decimal"
              className="h-11"
              onChange={(e) => setQtd(e.target.value)}
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

export function ContribuicoesTab({
  data,
  onChanged,
}: {
  data: EnsaioAdminData
  onChanged: () => Promise<void>
}) {
  const [refeicao, setRefeicao] = useState(TODOS)
  const [igreja, setIgreja] = useState(TODOS)
  const [editing, setEditing] = useState<Contribuicao | null>(null)
  const itemById = useMemo(() => new Map(data.itens.map((i) => [i.id, i])), [data.itens])

  const filtradas = data.contribuicoes.filter((c) => {
    const item = itemById.get(c.itemId)
    if (refeicao !== TODOS && item?.refeicao !== refeicao) return false
    if (igreja !== TODOS && (c.igrejaId ?? NENHUMA) !== igreja) return false
    return true
  })

  async function excluir(id: string) {
    try {
      await excluirContribuicao(id)
      toast.success('Contribuição excluída')
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Select value={refeicao} onValueChange={setRefeicao}>
          <SelectTrigger className="h-10 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as refeições</SelectItem>
            <SelectItem value="cafe">{MEAL_LABELS.cafe}</SelectItem>
            <SelectItem value="almoco">{MEAL_LABELS.almoco}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={igreja} onValueChange={setIgreja}>
          <SelectTrigger className="h-10 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as igrejas</SelectItem>
            {data.igrejas.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nome}
              </SelectItem>
            ))}
            <SelectItem value={NENHUMA}>Sem igreja (ajustes)</SelectItem>
          </SelectContent>
        </Select>
        <span className="self-center text-sm text-muted-foreground">
          {filtradas.length} contribuições
        </span>
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma contribuição.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {filtradas.map((c) => {
            const item = itemById.get(c.itemId)
            return (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item?.nome ?? '—'}
                    {item && item.sabores.length > 0
                      ? ` (${c.sabor ?? 'não informado'})`
                      : ''}{' '}
                    · {formatQty(c.quantidade, item?.unidade ?? '')}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDataHora(c.criadoEm)} · {c.pessoa} · {c.igrejaNome ?? '—'}
                  </p>
                </div>
                {c.origem !== 'link' ? (
                  <Badge variant="secondary">{c.origem}</Badge>
                ) : null}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Editar contribuição"
                  onClick={() => setEditing(c)}
                >
                  <Pencil className="size-4" />
                </Button>
                <ConfirmButton
                  title="Excluir esta contribuição?"
                  description={`${c.pessoa} · ${item?.nome ?? ''}`}
                  onConfirm={() => void excluir(c.id)}
                >
                  <Button size="icon" variant="ghost" aria-label="Excluir contribuição">
                    <Trash2 className="size-4" />
                  </Button>
                </ConfirmButton>
              </li>
            )
          })}
        </ul>
      )}

      <EditDialog
        contrib={editing}
        item={editing ? itemById.get(editing.itemId) : undefined}
        data={data}
        onClose={() => setEditing(null)}
        onSaved={onChanged}
      />
    </div>
  )
}
