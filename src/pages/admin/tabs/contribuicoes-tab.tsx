import { useEffect, useMemo, useState } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
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
  formatEntrouNecessario,
  formatQty,
  isItemCompleto,
  itemTotal,
  MEAL_LABELS,
  parseQuantidadeInput,
  type Contribuicao,
  type Item,
} from '@/data/ensaio'
import { atualizarContribuicao, excluirContribuicao } from '@/lib/admin-api'
import { agruparContribuicoes } from '@/lib/agrupar-contribuicoes'
import { cn } from '@/lib/utils'
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
  const [busca, setBusca] = useState('')
  const [editing, setEditing] = useState<Contribuicao | null>(null)
  const itemById = useMemo(() => new Map(data.itens.map((i) => [i.id, i])), [data.itens])

  const filtradas = data.contribuicoes.filter((c) => {
    const item = itemById.get(c.itemId)
    if (refeicao !== TODOS && item?.refeicao !== refeicao) return false
    if (igreja !== TODOS && (c.igrejaId ?? NENHUMA) !== igreja) return false
    return true
  })
  const grupos = agruparContribuicoes(data.itens, filtradas, busca)
  const totalVisiveis = grupos.reduce((n, g) => n + g.contribuicoes.length, 0)

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
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por item, pessoa, igreja ou sabor…"
          className="h-11 pl-9 text-base"
        />
      </div>
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
          {totalVisiveis} contribuições
        </span>
      </div>

      {grupos.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma contribuição encontrada.
        </p>
      ) : (
        grupos.map(({ item, total, contribuicoes }) => {
          // Entrou considera todas as contribuições do item, não só as da busca
          const entrou = itemTotal(item, data.contribuicoes)
          const completo = isItemCompleto(item, data.contribuicoes)
          return (
            <section key={item.id} className="rounded-xl border bg-card">
              <header className="flex items-start justify-between gap-2 border-b px-3 py-2">
                <h3 className="truncate text-sm font-semibold">
                  {item.nome}{' '}
                  <span className="font-normal text-muted-foreground">
                    · {MEAL_LABELS[item.refeicao]}
                  </span>
                </h3>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      completo ? 'text-emerald-600' : 'text-destructive',
                    )}
                  >
                    {formatEntrouNecessario(entrou, item)}
                  </p>
                  {total !== entrou ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatQty(total, item.unidade)} nesta busca
                    </p>
                  ) : null}
                </div>
              </header>
              <ul className="divide-y">
                {contribuicoes.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="w-16 shrink-0 text-sm font-medium tabular-nums">
                      {formatQty(c.quantidade, item.unidade)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {c.pessoa}
                        {item.sabores.length > 0
                          ? ` · ${c.sabor ?? 'sabor não informado'}`
                          : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.igrejaNome ?? '—'} · {formatDataHora(c.criadoEm)}
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
                      description={`${c.pessoa} · ${item.nome}`}
                      onConfirm={() => void excluir(c.id)}
                    >
                      <Button size="icon" variant="ghost" aria-label="Excluir contribuição">
                        <Trash2 className="size-4" />
                      </Button>
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
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
