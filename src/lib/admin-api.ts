import type {
  Contribuicao,
  Ensaio,
  Igreja,
  Item,
  MealKey,
  Origem,
  Regiao,
  StatusEnsaio,
  Unit,
} from '@/data/ensaio'
import { toMensagem, type DbError } from '@/lib/admin-errors'
import { requireSupabase } from '@/lib/supabase'

export { toMensagem }

export type RegiaoComIgrejas = Regiao & { igrejas: Igreja[] }

type DbResult = { data: unknown; error: DbError | null }

/** Lança Error com mensagem traduzida; devolve `data` com o tipo informado */
async function run<T = unknown>(query: PromiseLike<DbResult>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(toMensagem(error))
  return data as T
}

function db() {
  return requireSupabase()
}

// ---------------------------------------------------------------------------
// Regiões e igrejas
// ---------------------------------------------------------------------------

export async function listRegioes(): Promise<RegiaoComIgrejas[]> {
  const rows = await run<
    { id: string; nome: string; igrejas: { id: string; nome: string }[] }[]
  >(db().from('regioes').select('id, nome, igrejas(id, nome)').order('nome'))
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    igrejas: [...r.igrejas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }))
}

export async function criarRegiao(nome: string): Promise<void> {
  await run(db().from('regioes').insert({ nome: nome.trim() }))
}

export async function renomearRegiao(id: string, nome: string): Promise<void> {
  await run(db().from('regioes').update({ nome: nome.trim() }).eq('id', id))
}

export async function excluirRegiao(id: string): Promise<void> {
  await run(db().from('regioes').delete().eq('id', id))
}

export async function criarIgreja(regiaoId: string, nome: string): Promise<void> {
  await run(db().from('igrejas').insert({ regiao_id: regiaoId, nome: nome.trim() }))
}

export async function renomearIgreja(id: string, nome: string): Promise<void> {
  await run(db().from('igrejas').update({ nome: nome.trim() }).eq('id', id))
}

export async function excluirIgreja(id: string): Promise<void> {
  await run(db().from('igrejas').delete().eq('id', id))
}

// ---------------------------------------------------------------------------
// Ensaios
// ---------------------------------------------------------------------------

export type EnsaioResumo = Ensaio & { totalItens: number }

type EnsaioRow = {
  id: string
  nome: string
  slug: string
  data: string
  status: StatusEnsaio
  regiao: Regiao
}

const ENSAIO_COLS = 'id, nome, slug, data, status, regiao:regioes(id, nome)'

export async function listEnsaios(): Promise<EnsaioResumo[]> {
  const rows = await run<(EnsaioRow & { itens: { count: number }[] })[]>(
    db()
      .from('ensaios')
      .select(`${ENSAIO_COLS}, itens(count)`)
      .order('data', { ascending: false }),
  )
  return rows.map(({ itens, ...e }) => ({ ...e, totalItens: itens[0]?.count ?? 0 }))
}

export async function listSlugs(): Promise<string[]> {
  const rows = await run<{ slug: string }[]>(db().from('ensaios').select('slug'))
  return rows.map((r) => r.slug)
}

export async function criarEnsaio(input: {
  regiaoId: string
  nome: string
  slug: string
  data: string
}): Promise<string> {
  const row = await run<{ id: string }>(
    db()
      .from('ensaios')
      .insert({
        regiao_id: input.regiaoId,
        nome: input.nome.trim(),
        slug: input.slug,
        data: input.data,
      })
      .select('id')
      .single(),
  )
  return row.id
}

/** Copia a lista de itens (sem contribuições); devolve quantos foram copiados */
export async function copiarItens(origemId: string, destinoId: string): Promise<number> {
  const itens = await run<
    {
      refeicao: MealKey
      nome: string
      qtd_necessaria: number | null
      unidade: Unit
      sabores: string[]
      ordem: number
    }[]
  >(
    db()
      .from('itens')
      .select('refeicao, nome, qtd_necessaria, unidade, sabores, ordem')
      .eq('ensaio_id', origemId),
  )
  if (itens.length === 0) return 0
  await run(db().from('itens').insert(itens.map((i) => ({ ...i, ensaio_id: destinoId }))))
  return itens.length
}

export async function excluirEnsaio(id: string): Promise<void> {
  await run(db().from('ensaios').delete().eq('id', id))
}

export async function getEnsaio(id: string): Promise<Ensaio> {
  return run<Ensaio>(db().from('ensaios').select(ENSAIO_COLS).eq('id', id).single())
}

export async function atualizarEnsaio(
  id: string,
  patch: Partial<{ nome: string; slug: string; data: string; status: StatusEnsaio }>,
): Promise<void> {
  await run(db().from('ensaios').update(patch).eq('id', id))
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

export type ItemInput = {
  refeicao: MealKey
  nome: string
  qtdNecessaria: number | null
  unidade: Unit
  sabores: string[]
}

type ItemRow = {
  id: string
  refeicao: MealKey
  nome: string
  qtd_necessaria: number | null
  unidade: Unit
  sabores: string[]
  ordem: number
}

function toItem(r: ItemRow): Item {
  return {
    id: r.id,
    refeicao: r.refeicao,
    nome: r.nome,
    qtdNecessaria: r.qtd_necessaria == null ? null : Number(r.qtd_necessaria),
    unidade: r.unidade,
    sabores: r.sabores ?? [],
    ordem: r.ordem,
  }
}

function itemColumns(input: ItemInput) {
  return {
    refeicao: input.refeicao,
    nome: input.nome.trim(),
    qtd_necessaria: input.qtdNecessaria,
    unidade: input.unidade,
    sabores: input.sabores,
  }
}

const ITEM_COLS = 'id, refeicao, nome, qtd_necessaria, unidade, sabores, ordem'

export async function listItens(ensaioId: string): Promise<Item[]> {
  const rows = await run<ItemRow[]>(
    db()
      .from('itens')
      .select(ITEM_COLS)
      .eq('ensaio_id', ensaioId)
      .order('refeicao')
      .order('ordem')
      .order('nome'),
  )
  return rows.map(toItem)
}

export async function criarItem(ensaioId: string, input: ItemInput): Promise<Item> {
  const ultimos = await run<{ ordem: number }[]>(
    db()
      .from('itens')
      .select('ordem')
      .eq('ensaio_id', ensaioId)
      .eq('refeicao', input.refeicao)
      .order('ordem', { ascending: false })
      .limit(1),
  )
  const ordem = (ultimos[0]?.ordem ?? -1) + 1
  const row = await run<ItemRow>(
    db()
      .from('itens')
      .insert({ ...itemColumns(input), ensaio_id: ensaioId, ordem })
      .select(ITEM_COLS)
      .single(),
  )
  return toItem(row)
}

export async function atualizarItem(id: string, input: ItemInput): Promise<void> {
  await run(db().from('itens').update(itemColumns(input)).eq('id', id))
}

export async function excluirItem(id: string): Promise<void> {
  await run(db().from('itens').delete().eq('id', id))
}

/** ordem = posição na lista */
export async function reordenarItens(idsEmOrdem: string[]): Promise<void> {
  await Promise.all(
    idsEmOrdem.map((id, ordem) => run(db().from('itens').update({ ordem }).eq('id', id))),
  )
}

// ---------------------------------------------------------------------------
// Contribuições
// ---------------------------------------------------------------------------

type ContribuicaoRow = {
  id: string
  item_id: string
  igreja_id: string | null
  pessoa: string
  sabor: string | null
  quantidade: number
  origem: Origem
  criado_em: string
  igreja: { nome: string } | null
}

export async function listContribuicoes(ensaioId: string): Promise<Contribuicao[]> {
  const rows = await run<ContribuicaoRow[]>(
    db()
      .from('contribuicoes')
      .select(
        'id, item_id, igreja_id, pessoa, sabor, quantidade, origem, criado_em, igreja:igrejas(nome), itens!inner(ensaio_id)',
      )
      .eq('itens.ensaio_id', ensaioId)
      .order('criado_em', { ascending: false }),
  )
  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    igrejaId: r.igreja_id,
    igrejaNome: r.igreja?.nome ?? null,
    pessoa: r.pessoa,
    sabor: r.sabor,
    quantidade: Number(r.quantidade),
    origem: r.origem,
    criadoEm: r.criado_em,
  }))
}

export async function atualizarContribuicao(
  id: string,
  patch: { pessoa: string; igrejaId: string | null; sabor: string | null; quantidade: number },
): Promise<void> {
  await run(
    db()
      .from('contribuicoes')
      .update({
        pessoa: patch.pessoa.trim(),
        igreja_id: patch.igrejaId,
        sabor: patch.sabor,
        quantidade: patch.quantidade,
      })
      .eq('id', id),
  )
}

export async function excluirContribuicao(id: string): Promise<void> {
  await run(db().from('contribuicoes').delete().eq('id', id))
}
