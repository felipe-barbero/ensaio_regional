import { roundQty, type Contribuicao, type Item } from '../data/ensaio.ts'

export type GrupoContribuicoes = {
  item: Item
  /** Soma das contribuições exibidas no grupo */
  total: number
  contribuicoes: Contribuicao[]
}

const ORDEM_REFEICAO = { cafe: 0, almoco: 1 } as const

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/**
 * Agrupa por item na ordem da lista (café, depois almoço; `ordem`, depois nome).
 * A busca casa com o item (traz o grupo inteiro) ou com pessoa/igreja/sabor.
 * Mantém a ordem das contribuições recebidas.
 */
export function agruparContribuicoes(
  itens: Item[],
  contribuicoes: Contribuicao[],
  busca: string,
): GrupoContribuicoes[] {
  const q = normalizar(busca.trim())
  const ordenados = [...itens].sort(
    (a, b) =>
      ORDEM_REFEICAO[a.refeicao] - ORDEM_REFEICAO[b.refeicao] ||
      a.ordem - b.ordem ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  )

  const grupos: GrupoContribuicoes[] = []
  for (const item of ordenados) {
    const doItem = contribuicoes.filter((c) => c.itemId === item.id)
    const visiveis =
      !q || normalizar(item.nome).includes(q)
        ? doItem
        : doItem.filter((c) =>
            [c.pessoa, c.igrejaNome ?? '', c.sabor ?? ''].some((campo) =>
              normalizar(campo).includes(q),
            ),
          )
    if (visiveis.length === 0) continue
    grupos.push({
      item,
      total: roundQty(visiveis.reduce((sum, c) => sum + c.quantidade, 0)),
      contribuicoes: visiveis,
    })
  }
  return grupos
}
