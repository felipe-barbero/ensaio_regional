import { expect, test } from 'vitest'

import { mapEnsaioPublico } from './ensaio-map'

const payload = {
  ensaio: {
    id: 'e1',
    nome: 'Ensaio Regional Bombinhas',
    slug: 'bombinhas-2026-11-15',
    data: '2026-11-15',
    status: 'aberto',
    regiao: { id: 'r1', nome: 'Bombinhas' },
  },
  igrejas: [{ id: 'g1', nome: 'Zimbros' }],
  itens: [
    {
      id: 'i1',
      refeicao: 'cafe',
      nome: 'Açúcar',
      qtd_necessaria: 10,
      unidade: 'kg',
      sabores: [],
      ordem: 0,
    },
    {
      id: 'i2',
      refeicao: 'almoco',
      nome: 'Garfos',
      qtd_necessaria: null,
      unidade: 'un',
      sabores: null,
      ordem: 1,
    },
  ],
  contribuicoes: [
    {
      id: 'c1',
      item_id: 'i1',
      igreja_id: 'g1',
      igreja_nome: 'Zimbros',
      pessoa: 'Felipe',
      sabor: null,
      quantidade: 2.5,
      origem: 'link',
      criado_em: '2026-10-22T10:00:00+00:00',
    },
  ],
}

test('null vira null', () => {
  expect(mapEnsaioPublico(null)).toBeNull()
})

test('converte snake_case para os tipos do front', () => {
  const r = mapEnsaioPublico(payload)!
  expect(r.ensaio).toEqual(payload.ensaio)
  expect(r.igrejas).toEqual([{ id: 'g1', nome: 'Zimbros' }])
  expect(r.itens[0]).toEqual({
    id: 'i1',
    refeicao: 'cafe',
    nome: 'Açúcar',
    qtdNecessaria: 10,
    unidade: 'kg',
    sabores: [],
    ordem: 0,
  })
  expect(r.contribuicoes[0]).toEqual({
    id: 'c1',
    itemId: 'i1',
    igrejaId: 'g1',
    igrejaNome: 'Zimbros',
    pessoa: 'Felipe',
    sabor: null,
    quantidade: 2.5,
    origem: 'link',
    criadoEm: '2026-10-22T10:00:00+00:00',
  })
})

test('qtd_necessaria null e sabores null', () => {
  const r = mapEnsaioPublico(payload)!
  expect(r.itens[1].qtdNecessaria).toBeNull()
  expect(r.itens[1].sabores).toEqual([])
})
