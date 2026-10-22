import { expect, test } from 'vitest'

import type { Contribuicao, Item } from '../data/ensaio.ts'
import { contribuicoesCsv } from './exportar-csv'

const leite: Item = {
  id: 'leite',
  refeicao: 'cafe',
  nome: 'Leite',
  qtdNecessaria: 36,
  unidade: 'L',
  sabores: [],
  ordem: 1,
}
const bolo: Item = {
  id: 'bolo',
  refeicao: 'cafe',
  nome: 'Bolo; "caseiro"',
  qtdNecessaria: 18,
  unidade: 'un',
  sabores: ['Chocolate'],
  ordem: 0,
}

const c = (
  itemId: string,
  pessoa: string,
  quantidade: number,
  extra: Partial<Contribuicao> = {},
): Contribuicao => ({
  id: crypto.randomUUID(),
  itemId,
  igrejaId: 'g',
  igrejaNome: 'José Amândio',
  pessoa,
  sabor: null,
  quantidade,
  origem: 'link',
  criadoEm: '2026-10-20T19:28:00Z',
  ...extra,
})

test('gera CSV com BOM, separador ; e itens na ordem da lista', () => {
  const csv = contribuicoesCsv(
    [leite, bolo],
    [
      c('leite', 'Davi', 12.5),
      c('bolo', 'Cléia', 5, { sabor: 'Chocolate' }),
      c('leite', 'Ajuste importado', 2, { igrejaId: null, igrejaNome: null, origem: 'ajuste' }),
    ],
  )
  const linhas = csv.slice(1).split('\r\n')

  expect(csv.startsWith('﻿')).toBe(true)
  expect(linhas[0]).toBe(
    'Refeição;Item;Entrou/Necessário;Pessoa;Igreja;Sabor;Quantidade;Unidade;Origem;Data',
  )
  expect(linhas[1]).toBe(
    'Café da Manhã;"Bolo; ""caseiro""";5/18 un;Cléia;José Amândio;Chocolate;5;un;link;20/10/2026 16:28',
  )
  expect(linhas[2]).toBe(
    'Café da Manhã;Leite;14.5/36 L;Davi;José Amândio;;12,5;L;link;20/10/2026 16:28',
  )
  expect(linhas[3]).toBe(
    'Café da Manhã;Leite;14.5/36 L;Ajuste importado;;;2;L;ajuste;20/10/2026 16:28',
  )
  expect(linhas).toHaveLength(4)
})
