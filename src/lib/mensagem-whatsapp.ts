import {
  formatQty,
  isItemCompleto,
  itemFalta,
  MEAL_LABELS,
  type Contribuicao,
  type Ensaio,
  type Item,
  type MealKey,
} from '../data/ensaio.ts'
import { formatData } from './format.ts'

/** Texto pronto para colar no grupo: o que ainda falta numa refeição + link */
export function mensagemFaltantes(
  ensaio: Ensaio,
  refeicao: MealKey,
  itens: Item[],
  contribuicoes: Contribuicao[],
  url: string,
): string {
  const titulo = `*${ensaio.nome} · ${formatData(ensaio.data)}*`
  const faltando = itens
    .filter((i) => i.refeicao === refeicao && !isItemCompleto(i, contribuicoes))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))

  if (faltando.length === 0) {
    return [titulo, `*${MEAL_LABELS[refeicao]}* está completo. Obrigado a todos! 🙏`].join(
      '\n',
    )
  }

  const linhas = faltando.map((item) => {
    const falta = itemFalta(item, contribuicoes)
    return falta == null
      ? `• ${item.nome}`
      : `• ${item.nome}: ${formatQty(falta, item.unidade)}`
  })

  return [
    titulo,
    `*${MEAL_LABELS[refeicao]}* — ainda faltam:`,
    '',
    ...linhas,
    '',
    `Contribua pelo link: ${url}`,
  ].join('\n')
}
