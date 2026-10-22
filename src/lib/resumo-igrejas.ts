import type { Contribuicao, Igreja, Item } from '../data/ensaio.ts'
import { agruparContribuicoes } from './agrupar-contribuicoes.ts'

export type ResumoIgreja = {
  igrejaId: string | null
  nome: string
  contribuicoes: number
  /** Pessoas distintas (pelo nome) */
  pessoas: number
  itens: { item: Item; total: number }[]
}

/** Quanto cada igreja da região trouxe, item a item (ajustes sem igreja no fim) */
export function resumoPorIgreja(
  itens: Item[],
  igrejas: Igreja[],
  contribuicoes: Contribuicao[],
): ResumoIgreja[] {
  const resumo = (igrejaId: string | null, nome: string): ResumoIgreja => {
    const daIgreja = contribuicoes.filter((c) => c.igrejaId === igrejaId)
    return {
      igrejaId,
      nome,
      contribuicoes: daIgreja.length,
      pessoas: new Set(daIgreja.map((c) => c.pessoa.trim().toLocaleLowerCase('pt-BR'))).size,
      itens: agruparContribuicoes(itens, daIgreja, '').map(({ item, total }) => ({
        item,
        total,
      })),
    }
  }

  const lista = [...igrejas]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((g) => resumo(g.id, g.nome))

  if (contribuicoes.some((c) => c.igrejaId == null)) {
    lista.push(resumo(null, 'Sem igreja (ajustes)'))
  }
  return lista
}
