import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  copiarItens,
  criarEnsaio,
  excluirEnsaio,
  listEnsaios,
  listRegioes,
  listSlugs,
  type EnsaioResumo,
  type RegiaoComIgrejas,
} from '@/lib/admin-api'
import { formatData } from '@/lib/format'
import { gerarSlug, normalizarSlug, slugDigitando, slugUnico } from '@/lib/slug'

const NENHUM = 'nenhum'

export function EnsaioNewPage() {
  const navigate = useNavigate()
  const [regioes, setRegioes] = useState<RegiaoComIgrejas[]>([])
  const [ensaios, setEnsaios] = useState<EnsaioResumo[]>([])
  const [slugs, setSlugs] = useState<string[]>([])
  const [regiaoId, setRegiaoId] = useState('')
  const [data, setData] = useState('')
  const [nome, setNome] = useState('')
  const [nomeEditado, setNomeEditado] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugEditado, setSlugEditado] = useState(false)
  const [origemId, setOrigemId] = useState(NENHUM)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([listRegioes(), listEnsaios(), listSlugs()])
      .then(([r, e, s]) => {
        setRegioes(r)
        setEnsaios(e)
        setSlugs(s)
      })
      .catch((err: Error) => toast.error(err.message))
  }, [])

  const regiao = regioes.find((r) => r.id === regiaoId)

  // Sugestões enquanto o admin não editar o campo
  useEffect(() => {
    if (!regiao) return
    if (!nomeEditado) setNome(`Ensaio Regional ${regiao.nome}`)
    if (!slugEditado && data) setSlug(slugUnico(gerarSlug(regiao.nome, data), slugs))
  }, [regiao, data, slugs, nomeEditado, slugEditado])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const slugFinal = normalizarSlug(slug)
    if (!regiaoId || !data || !nome.trim() || !slugFinal) {
      toast.error('Preencha região, data, nome e link')
      return
    }

    setBusy(true)
    let novoId: string | null = null
    try {
      novoId = await criarEnsaio({ regiaoId, nome, slug: slugFinal, data })
      if (origemId !== NENHUM) {
        const n = await copiarItens(origemId, novoId)
        toast.success(`Ensaio criado com ${n} itens copiados`)
      } else {
        toast.success('Ensaio criado')
      }
      navigate(`/admin/ensaios/${novoId}`)
    } catch (err) {
      // Sem ensaio pela metade: desfaz se a cópia falhou
      if (novoId) await excluirEnsaio(novoId).catch(() => undefined)
      toast.error(err instanceof Error ? err.message : 'Erro ao criar ensaio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Novo ensaio</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-1.5">
            <Label>Região</Label>
            <Select value={regiaoId} onValueChange={setRegiaoId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Selecione a região" />
              </SelectTrigger>
              <SelectContent>
                {regioes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {regiao && regiao.igrejas.length === 0 ? (
              <p className="text-xs text-destructive">
                Esta região ainda não tem igrejas cadastradas.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="novo-data">Data</Label>
            <Input
              id="novo-data"
              type="date"
              value={data}
              className="h-11"
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="novo-nome">Nome</Label>
            <Input
              id="novo-nome"
              value={nome}
              className="h-11"
              onChange={(e) => {
                setNomeEditado(true)
                setNome(e.target.value)
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="novo-slug">Link</Label>
            <Input
              id="novo-slug"
              value={slug}
              className="h-11 font-mono"
              onChange={(e) => {
                setSlugEditado(true)
                setSlug(slugDigitando(e.target.value))
              }}
            />
            <p className="truncate text-xs text-muted-foreground">
              …/ensaio_regional/e/{slug || '<link>'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Copiar lista de</Label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Nenhum (começar vazio)</SelectItem>
                {ensaios.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome} · {formatData(e.data)} ({e.totalItens} itens)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Criar ensaio
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
