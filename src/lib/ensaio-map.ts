// Sem alias `@/` nem import.meta.env: também é usado pelos scripts (tsx).
import type {
  Contribuicao,
  EnsaioPublico,
  Item,
} from '../data/ensaio.ts'

type RawItem = {
  id: string
  refeicao: Item['refeicao']
  nome: string
  qtd_necessaria: number | null
  unidade: Item['unidade']
  sabores: string[] | null
  ordem: number
}

type RawContribuicao = {
  id: string
  item_id: string
  igreja_id: string | null
  igreja_nome: string | null
  pessoa: string
  sabor: string | null
  quantidade: number
  origem: Contribuicao['origem']
  criado_em: string
}

type RawEnsaioPublico = Pick<EnsaioPublico, 'ensaio' | 'igrejas'> & {
  itens: RawItem[]
  contribuicoes: RawContribuicao[]
}

/** Converte o JSON de `ensaio_publico` / `contribuir` nos tipos do front */
export function mapEnsaioPublico(json: unknown): EnsaioPublico | null {
  if (!json || typeof json !== 'object') return null
  const raw = json as RawEnsaioPublico

  return {
    ensaio: raw.ensaio,
    igrejas: raw.igrejas ?? [],
    itens: (raw.itens ?? []).map((i) => ({
      id: i.id,
      refeicao: i.refeicao,
      nome: i.nome,
      qtdNecessaria: i.qtd_necessaria == null ? null : Number(i.qtd_necessaria),
      unidade: i.unidade ?? '',
      sabores: i.sabores ?? [],
      ordem: i.ordem,
    })),
    contribuicoes: (raw.contribuicoes ?? []).map((c) => ({
      id: c.id,
      itemId: c.item_id,
      igrejaId: c.igreja_id,
      igrejaNome: c.igreja_nome,
      pessoa: c.pessoa,
      sabor: c.sabor,
      quantidade: Number(c.quantidade),
      origem: c.origem,
      criadoEm: c.criado_em,
    })),
  }
}
