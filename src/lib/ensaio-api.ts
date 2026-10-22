import type { ContribuirInput, EnsaioPublico } from '@/data/ensaio'
import { mapEnsaioPublico } from '@/lib/ensaio-map'
import { requireSupabase } from '@/lib/supabase'

export { mapEnsaioPublico }

export async function fetchEnsaio(slug: string): Promise<EnsaioPublico | null> {
  const { data, error } = await requireSupabase().rpc('ensaio_publico', {
    p_slug: slug,
  })
  if (error) throw new Error(error.message)
  return mapEnsaioPublico(data)
}

export async function contribuir(
  slug: string,
  input: ContribuirInput,
): Promise<EnsaioPublico> {
  const { data, error } = await requireSupabase().rpc('contribuir', {
    p_slug: slug,
    p_item_id: input.itemId,
    p_igreja_id: input.igrejaId,
    p_pessoa: input.pessoa,
    p_sabor: input.sabor,
    p_quantidade: input.quantidade,
  })
  if (error) throw new Error(error.message)
  const result = mapEnsaioPublico(data)
  if (!result) throw new Error('Ensaio não encontrado')
  return result
}
