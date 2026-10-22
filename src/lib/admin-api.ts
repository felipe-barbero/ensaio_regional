import type {
  Ensaio,
  Igreja,
  MealKey,
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
