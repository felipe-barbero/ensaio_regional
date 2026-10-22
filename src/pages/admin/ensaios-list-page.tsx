import { useEffect, useState } from 'react'
import { ChevronRight, Loader2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { listEnsaios, type EnsaioResumo } from '@/lib/admin-api'
import { formatData } from '@/lib/format'

export function EnsaiosListPage() {
  const [ensaios, setEnsaios] = useState<EnsaioResumo[] | null>(null)

  useEffect(() => {
    listEnsaios()
      .then(setEnsaios)
      .catch((err: Error) => toast.error(err.message))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Ensaios
        </h1>
        <Button asChild>
          <Link to="/admin/ensaios/novo">
            <Plus className="size-4" />
            Novo ensaio
          </Link>
        </Button>
      </div>

      {ensaios == null ? (
        <Loader2 className="mx-auto size-6 animate-spin" />
      ) : ensaios.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum ensaio cadastrado ainda.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {ensaios.map((e) => (
            <li key={e.id}>
              <Link
                to={`/admin/ensaios/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.regiao.nome} · {formatData(e.data)} · {e.totalItens}{' '}
                    {e.totalItens === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <StatusBadge status={e.status} />
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
