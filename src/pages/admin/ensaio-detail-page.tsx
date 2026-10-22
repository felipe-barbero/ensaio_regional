import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, ExternalLink, Loader2, MessageCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MEAL_LABELS,
  type Contribuicao,
  type Ensaio,
  type Igreja,
  type Item,
  type MealKey,
} from '@/data/ensaio'
import {
  getEnsaio,
  listContribuicoes,
  listItens,
  listRegioes,
} from '@/lib/admin-api'
import { baixarArquivo, contribuicoesCsv } from '@/lib/exportar-csv'
import { formatData } from '@/lib/format'
import { ensaioUrl } from '@/lib/links'
import { mensagemFaltantes } from '@/lib/mensagem-whatsapp'
import { ContribuicoesTab } from '@/pages/admin/tabs/contribuicoes-tab'
import { DadosTab } from '@/pages/admin/tabs/dados-tab'
import { IgrejasTab } from '@/pages/admin/tabs/igrejas-tab'
import { ItensTab } from '@/pages/admin/tabs/itens-tab'

export type EnsaioAdminData = {
  ensaio: Ensaio
  igrejas: Igreja[]
  itens: Item[]
  contribuicoes: Contribuicao[]
}

const LINKS: { alvo: 'resumo' | MealKey; label: string }[] = [
  { alvo: 'resumo', label: 'Resumo' },
  { alvo: 'cafe', label: 'Café' },
  { alvo: 'almoco', label: 'Almoço' },
]

function CopyLinks({ slug }: { slug: string }) {
  async function copy(alvo: 'resumo' | MealKey) {
    try {
      await navigator.clipboard.writeText(ensaioUrl(slug, alvo))
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {LINKS.map(({ alvo, label }) => (
        <div key={alvo} className="flex">
          <Button
            variant="outline"
            size="sm"
            className="rounded-r-none"
            onClick={() => void copy(alvo)}
          >
            <Copy className="size-4" />
            Copiar link {label}
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-l-none border-l-0"
            aria-label={`Abrir ${label}`}
          >
            <a href={ensaioUrl(slug, alvo)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      ))}
    </div>
  )
}

function AcoesGrupo({ data }: { data: EnsaioAdminData }) {
  const { ensaio, itens, contribuicoes } = data

  async function copiarMensagem(meal: MealKey) {
    const texto = mensagemFaltantes(ensaio, meal, itens, contribuicoes, ensaioUrl(ensaio.slug, meal))
    try {
      await navigator.clipboard.writeText(texto)
      toast.success(`Mensagem do ${MEAL_LABELS[meal]} copiada — cole no grupo`)
    } catch {
      toast.error('Não foi possível copiar a mensagem')
    }
  }

  function exportar() {
    baixarArquivo(`contribuicoes-${ensaio.slug}.csv`, contribuicoesCsv(itens, contribuicoes))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(['cafe', 'almoco'] as MealKey[]).map((meal) => (
        <Button key={meal} variant="outline" size="sm" onClick={() => void copiarMensagem(meal)}>
          <MessageCircle className="size-4" />
          Mensagem do {meal === 'cafe' ? 'Café' : 'Almoço'}
        </Button>
      ))}
      <Button variant="outline" size="sm" onClick={exportar}>
        <Download className="size-4" />
        Exportar planilha
      </Button>
    </div>
  )
}

export function EnsaioDetailPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<EnsaioAdminData | null>(null)

  const load = useCallback(async () => {
    try {
      const [ensaio, itens, contribuicoes, regioes] = await Promise.all([
        getEnsaio(id),
        listItens(id),
        listContribuicoes(id),
        listRegioes(),
      ])
      const igrejas = regioes.find((r) => r.id === ensaio.regiao.id)?.igrejas ?? []
      setData({ ensaio, igrejas, itens, contribuicoes })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (!data) return <Loader2 className="mx-auto size-6 animate-spin" />

  const { ensaio } = data

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {ensaio.nome}
          </h1>
          <StatusBadge status={ensaio.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {ensaio.regiao.nome} · {formatData(ensaio.data)}
        </p>
        <CopyLinks slug={ensaio.slug} />
        <AcoesGrupo data={data} />
      </div>

      <Tabs defaultValue="itens">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="contribuicoes">Contribuições</TabsTrigger>
          <TabsTrigger value="igrejas">Por igreja</TabsTrigger>
        </TabsList>
        <TabsContent value="dados" className="pt-2">
          <DadosTab ensaio={ensaio} onChanged={load} />
        </TabsContent>
        <TabsContent value="itens" className="pt-2">
          <ItensTab data={data} onChanged={load} />
        </TabsContent>
        <TabsContent value="contribuicoes" className="pt-2">
          <ContribuicoesTab data={data} onChanged={load} />
        </TabsContent>
        <TabsContent value="igrejas" className="pt-2">
          <IgrejasTab data={data} />
        </TabsContent>
      </Tabs>
    </>
  )
}
