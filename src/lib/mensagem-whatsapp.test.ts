import { expect, test } from 'vitest'

import type { Contribuicao, Ensaio, Item } from '../data/ensaio.ts'
import { mensagemFaltantes } from './mensagem-whatsapp'

const ensaio: Ensaio = {
  id: 'e',
  nome: 'Ensaio Regional Bombinhas',
  slug: 'bombinhas-2026-11-15',
  data: '2026-11-15',
  status: 'aberto',
  regiao: { id: 'r', nome: 'Bombinhas' },
}

const item = (
  id: string,
  nome: string,
  qtdNecessaria: number | null,
  unidade: Item['unidade'],
  ordem: number,
  refeicao: Item['refeicao'] = 'cafe',
): Item => ({ id, refeicao, nome, qtdNecessaria, unidade, sabores: [], ordem })

const c = (itemId: string, quantidade: number): Contribuicao => ({
  id: crypto.randomUUID(),
  itemId,
  igrejaId: 'g',
  igrejaNome: 'Bombas',
  pessoa: 'Fulano',
  sabor: null,
  quantidade,
  origem: 'link',
  criadoEm: '2026-10-22T10:00:00Z',
})

const URL_CAFE = 'https://x.github.io/ensaio_regional/e/bombinhas-2026-11-15/cafe'

test('lista o que falta, na ordem dos itens, só da refeição pedida', () => {
  const itens = [
    item('pao', 'Pão', 500, 'un', 2),
    item('queijo', 'Queijo fatiado', 2, 'kg', 1),
    item('acucar', 'Açúcar', 10, 'kg', 0),
    item('copos', 'Copos', null, 'un', 3),
    item('arroz', 'Arroz', 20, 'kg', 0, 'almoco'),
  ]
  const contribs = [c('acucar', 10), c('queijo', 1.5), c('pao', 200)]

  expect(mensagemFaltantes(ensaio, 'cafe', itens, contribs, URL_CAFE)).toBe(
    [
      '*Ensaio Regional Bombinhas · 15/11/2026*',
      '*Café da Manhã* — ainda faltam:',
      '',
      '• Queijo fatiado: 0.5 kg',
      '• Pão: 300 un',
      '• Copos',
      '',
      `Contribua pelo link: ${URL_CAFE}`,
    ].join('\n'),
  )
})

test('refeição completa agradece', () => {
  const itens = [item('acucar', 'Açúcar', 10, 'kg', 0)]
  expect(mensagemFaltantes(ensaio, 'cafe', itens, [c('acucar', 12)], URL_CAFE)).toBe(
    [
      '*Ensaio Regional Bombinhas · 15/11/2026*',
      '*Café da Manhã* está completo. Obrigado a todos! 🙏',
    ].join('\n'),
  )
})
