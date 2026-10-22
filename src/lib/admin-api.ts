import type { Igreja, Regiao } from '@/data/ensaio'
import { toMensagem, type DbError } from '@/lib/admin-errors'
import { requireSupabase } from '@/lib/supabase'

export { toMensagem }

export type RegiaoComIgrejas = Regiao & { igrejas: Igreja[] }

type DbResult<T> = { data: T | null; error: DbError | null }

/** Lança Error com mensagem traduzida; devolve `data` */
async function run<T>(query: PromiseLike<DbResult<T>>): Promise<T> {
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
