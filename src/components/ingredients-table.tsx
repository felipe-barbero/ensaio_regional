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
  formatNecessario,
  formatQty,
  isItemCompleto,
  itemFalta,
  itemTotal,
  saborTotal,
  type Contribuicao,
  type ContribuirInput,
  type Igreja,
  type Item,
} from '@/data/ensaio'
import { cn } from '@/lib/utils'

type IngredientsTableProps = {
  itens: Item[]
  contribuicoes: Contribuicao[]
  igrejas: Igreja[]
  disabled?: boolean
  encerrado?: boolean
  onContribute: (input: ContribuirInput) => Promise<void>
}

function StatusBadge({
  item,
  contribuicoes,
}: {
  item: Item
  contribuicoes: Contribuicao[]
}) {
  const total = itemTotal(item, contribuicoes)
  const falta = itemFalta(item, contribuicoes)

  if (total <= 0) return <Badge variant="outline">Pendente</Badge>
  if (falta == null) return <Badge variant="secondary">Registrado</Badge>
  if (isItemCompleto(item, contribuicoes)) {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        Completo
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">Falta {formatQty(falta, item.unidade)}</Badge>
  )
}

/** "Chocolate 4 · Cenoura 2 · Não informado 6" (omite zerados) */
function SaboresDetalhe({
  item,
  contribuicoes,
}: {
  item: Item
  contribuicoes: Contribuicao[]
}) {
  if (item.sabores.length === 0) return null
  const partes = [
    ...item.sabores.map((s) => [s, saborTotal(item, s, contribuicoes)] as const),
    ['Não informado', saborTotal(item, null, contribuicoes)] as const,
  ].filter(([, n]) => n > 0)
  if (partes.length === 0) return null

  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      {partes.map(([s, n]) => `${s} ${n}`).join(' · ')}
    </p>
  )
}

function IngredientCard({
  item,
  contribuicoes,
  disabled,
  encerrado,
  onContributeClick,
}: {
  item: Item
  contribuicoes: Contribuicao[]
  disabled?: boolean
  encerrado?: boolean
  onContributeClick: (item: Item) => void
}) {
  const total = itemTotal(item, contribuicoes)
  const incomplete = !isItemCompleto(item, contribuicoes) && item.qtdNecessaria != null

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
              {formatNecessario(item)}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Já entrou:{' '}
            <span className="font-medium text-foreground">
              {formatQty(total, item.unidade)}
            </span>
          </p>
          <SaboresDetalhe item={item} contribuicoes={contribuicoes} />
        </div>
        <StatusBadge item={item} contribuicoes={contribuicoes} />
      </div>

      {encerrado ? null : (
        <Button
          type="button"
          className="h-11 w-full touch-manipulation"
          disabled={disabled}
          onClick={() => onContributeClick(item)}
        >
          <Plus className="size-4" />
          Contribuir
        </Button>
      )}
    </article>
  )
}

export function IngredientsTable({
  itens,
  contribuicoes,
  igrejas,
  disabled,
  encerrado,
  onContribute,
}: IngredientsTableProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Item | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return itens
    return itens.filter((item) => item.nome.toLowerCase().includes(q))
  }, [itens, search])

  function openContribute(item: Item) {
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
                key={item.id}
                item={item}
                contribuicoes={contribuicoes}
                disabled={disabled}
                encerrado={encerrado}
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
                  {encerrado ? null : <TableHead className="w-36" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const total = itemTotal(item, contribuicoes)
                  const incomplete =
                    !isItemCompleto(item, contribuicoes) &&
                    item.qtdNecessaria != null

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(incomplete && 'bg-destructive/5')}
                    >
                      <TableCell className="font-medium">
                        {item.nome}
                        <SaboresDetalhe item={item} contribuicoes={contribuicoes} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNecessario(item)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatQty(total, item.unidade)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge item={item} contribuicoes={contribuicoes} />
                      </TableCell>
                      {encerrado ? null : (
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
                      )}
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
        item={selected}
        contribuicoes={contribuicoes}
        igrejas={igrejas}
        disabled={disabled}
        onContribute={onContribute}
      />
    </>
  )
}
