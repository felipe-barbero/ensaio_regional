import {
  formatEntrouNecessario,
  itemTotal,
  MEAL_LABELS,
  type Contribuicao,
  type Item,
} from '../data/ensaio.ts'
import { agruparContribuicoes } from './agrupar-contribuicoes.ts'

// Excel em pt-BR: separador ";", vírgula decimal e BOM para os acentos
const SEP = ';'

function celula(valor: string): string {
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDataHora(iso: string): string {
  return dataHora.format(new Date(iso)).replace(',', '')
}

/** Todas as contribuições, agrupadas por item na ordem da lista */
export function contribuicoesCsv(itens: Item[], contribuicoes: Contribuicao[]): string {
  const linhas = [
    [
      'Refeição',
      'Item',
      'Entrou/Necessário',
      'Pessoa',
      'Igreja',
      'Sabor',
      'Quantidade',
      'Unidade',
      'Origem',
      'Data',
    ],
  ]

  for (const grupo of agruparContribuicoes(itens, contribuicoes, '')) {
    const { item } = grupo
    const entrou = formatEntrouNecessario(itemTotal(item, contribuicoes), item)
    for (const c of grupo.contribuicoes) {
      linhas.push([
        MEAL_LABELS[item.refeicao],
        item.nome,
        entrou,
        c.pessoa,
        c.igrejaNome ?? '',
        c.sabor ?? '',
        String(c.quantidade).replace('.', ','),
        item.unidade,
        c.origem,
        formatDataHora(c.criadoEm),
      ])
    }
  }

  return '﻿' + linhas.map((l) => l.map(celula).join(SEP)).join('\r\n')
}

/** Dispara o download no navegador */
export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
