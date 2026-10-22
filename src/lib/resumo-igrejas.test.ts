import { expect, test } from 'vitest'

import type { Contribuicao, Igreja, Item } from '../data/ensaio.ts'
import { resumoPorIgreja } from './resumo-igrejas'

const item = (id: string, nome: string, unidade: Item['unidade'], ordem: number, refeicao: Item['refeicao'] = 'cafe'): Item => ({
  id,
  refeicao,
  nome,
  qtdNecessaria: 10,
  unidade,
  sabores: [],
  ordem,
})

const leite = item('leite', 'Leite', 'L', 1)
const acucar = item('acucar', 'Açúcar', 'kg', 0)
const arroz = item('arroz', 'Arroz', 'kg', 0, 'almoco')

const IGREJAS: Igreja[] = [
  { id: 'z', nome: 'Zimbros' },
  { id: 'b', nome: 'Bombas' },
  { id: 'j', nome: 'José Amândio' },
]

const c = (itemId: string, igrejaId: string | null, pessoa: string, quantidade: number): Contribuicao => ({
  id: crypto.randomUUID(),
  itemId,
  igrejaId,
  igrejaNome: IGREJAS.find((g) => g.id === igrejaId)?.nome ?? null,
  pessoa,
  sabor: null,
  quantidade,
  origem: igrejaId ? 'link' : 'ajuste',
  criadoEm: '2026-10-22T10:00:00Z',
})

test('soma por igreja e por item, igrejas em ordem alfabética, sem igreja no fim', () => {
  const contribs = [
    c('leite', 'b', 'Davi', 12),
    c('leite', 'b', 'Davi', 0.5),
    c('arroz', 'b', 'Ana', 5),
    c('acucar', 'z', 'Felipe', 6),
    c('leite', null, 'Ajuste importado', 2),
  ]
  const r = resumoPorIgreja([arroz, leite, acucar], IGREJAS, contribs)

  expect(r.map((g) => [g.nome, g.contribuicoes, g.pessoas])).toEqual([
    ['Bombas', 3, 2],
    ['José Amândio', 0, 0],
    ['Zimbros', 1, 1],
    ['Sem igreja (ajustes)', 1, 1],
  ])
  expect(r[0].itens.map((i) => [i.item.nome, i.total])).toEqual([
    ['Leite', 12.5],
    ['Arroz', 5],
  ])
})

test('sem ajustes não cria o grupo "sem igreja"', () => {
  const r = resumoPorIgreja([leite], IGREJAS, [c('leite', 'z', 'Felipe', 1)])
  expect(r.map((g) => g.nome)).toEqual(['Bombas', 'José Amândio', 'Zimbros'])
})
