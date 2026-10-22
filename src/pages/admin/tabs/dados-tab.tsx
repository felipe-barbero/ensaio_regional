import { useEffect, useState, type FormEvent } from 'react'
import { CopyPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmButton } from '@/components/confirm-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Ensaio } from '@/data/ensaio'
import { atualizarEnsaio, excluirEnsaio } from '@/lib/admin-api'
import { normalizarSlug, slugDigitando } from '@/lib/slug'

export function DadosTab({
  ensaio,
  onChanged,
}: {
  ensaio: Ensaio
  onChanged: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [nome, setNome] = useState(ensaio.nome)
  const [data, setData] = useState(ensaio.data)
  const [slug, setSlug] = useState(ensaio.slug)
  const [busy, setBusy] = useState(false)

  // Só ao trocar de ensaio: recarregar (ex.: Encerrar) não apaga edições em andamento
  useEffect(() => {
    setNome(ensaio.nome)
    setData(ensaio.data)
    setSlug(ensaio.slug)
  }, [ensaio.id])

  async function salvar(patch: Parameters<typeof atualizarEnsaio>[1], ok: string) {
    setBusy(true)
    try {
      await atualizarEnsaio(ensaio.id, patch)
      toast.success(ok)
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const slugFinal = normalizarSlug(slug)
    if (!nome.trim() || !data || !slugFinal) {
      toast.error('Preencha nome, data e link')
      return
    }
    void salvar({ nome: nome.trim(), data, slug: slugFinal }, 'Dados salvos')
  }

  async function excluir() {
    try {
      await excluirEnsaio(ensaio.id)
      toast.success('Ensaio excluído')
      navigate('/admin')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const aberto = ensaio.status === 'aberto'

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label>Região</Label>
              <p className="text-sm">{ensaio.regiao.nome}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dados-nome">Nome</Label>
              <Input
                id="dados-nome"
                value={nome}
                className="h-11"
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dados-data">Data</Label>
              <Input
                id="dados-data"
                type="date"
                value={data}
                className="h-11"
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dados-slug">Link</Label>
              <Input
                id="dados-slug"
                value={slug}
                className="h-11 font-mono"
                onChange={(e) => setSlug(slugDigitando(e.target.value))}
                onBlur={() => setSlug(normalizarSlug(slug))}
              />
              <p className="text-xs text-muted-foreground">
                Mudar o link invalida os links já enviados nos grupos.
              </p>
            </div>
            <Button type="submit" disabled={busy} className="justify-self-start">
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm text-muted-foreground">
            {aberto
              ? 'Encerrado, o ensaio continua visível mas não aceita contribuições.'
              : 'Ensaio encerrado: os links não aceitam contribuições.'}
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void salvar(
                { status: aberto ? 'encerrado' : 'aberto' },
                aberto ? 'Ensaio encerrado' : 'Ensaio reaberto',
              )
            }
          >
            {aberto ? 'Encerrar ensaio' : 'Reabrir ensaio'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/ensaios/novo?copiar=${ensaio.id}`)}
          >
            <CopyPlus className="size-4" />
            Duplicar ensaio
          </Button>
          <ConfirmButton
            title="Excluir este ensaio?"
            description="Isso apaga os itens e todas as contribuições deste ensaio."
            onConfirm={() => void excluir()}
          >
            <Button variant="destructive" disabled={busy}>
              Excluir ensaio
            </Button>
          </ConfirmButton>
        </CardContent>
      </Card>
    </div>
  )
}
