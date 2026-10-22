import { expect, test } from 'vitest'

import type { Contribuicao, Item } from '../data/ensaio.ts'
import { agruparContribuicoes } from './agrupar-contribuicoes'

const item = (id: string, refeicao: Item['refeicao'], nome: string, ordem: number): Item => ({
  id,
  refeicao,
  nome,
  qtdNecessaria: 10,
  unidade: 'L',
  sabores: [],
  ordem,
})

const leite = item('leite', 'cafe', 'Leite', 1)
const acucar = item('acucar', 'cafe', 'Açúcar', 0)
const arroz = item('arroz', 'almoco', 'Arroz', 0)
// Fora de ordem de propósito: almoço antes do café, Leite antes de Açúcar
const ITENS = [arroz, leite, acucar]

const c = (id: string, itemId: string, pessoa: string, quantidade: number, igrejaNome = 'Bombas'): Contribuicao => ({
  id,
  itemId,
  igrejaId: 'g',
  igrejaNome,
  pessoa,
  sabor: null,
  quantidade,
  origem: 'link',
  criadoEm: `2026-10-22T10:00:0${id}Z`,
})

const CONTRIBS = [
  c('1', 'leite', 'Fulano', 2),
  c('2', 'leite', 'Ciclano', 3, 'José Amândio'),
  c('3', 'arroz', 'Beltrano', 5),
  c('4', 'acucar', 'Fulano', 1.5),
]

test('agrupa por item seguindo a ordem dos ingredientes (café antes do almoço)', () => {
  const grupos = agruparContribuicoes(ITENS, CONTRIBS, '')
  expect(grupos.map((g) => [g.item.nome, g.total])).toEqual([
    ['Açúcar', 1.5],
    ['Leite', 5],
    ['Arroz', 5],
  ])
  expect(grupos[1].contribuicoes.map((x) => x.pessoa)).toEqual(['Fulano', 'Ciclano'])
})

test('itens sem contribuição não aparecem', () => {
  const grupos = agruparContribuicoes(ITENS, [c('1', 'leite', 'Fulano', 2)], '')
  expect(grupos.map((g) => g.item.nome)).toEqual(['Leite'])
})

test('busca por pessoa, sem acento e sem maiúscula, e o total é dos resultados', () => {
  const grupos = agruparContribuicoes(ITENS, CONTRIBS, 'fulano')
  expect(grupos.map((g) => [g.item.nome, g.total])).toEqual([
    ['Açúcar', 1.5],
    ['Leite', 2],
  ])
})

test('busca pelo nome do item traz o grupo inteiro', () => {
  const grupos = agruparContribuicoes(ITENS, CONTRIBS, 'acucar')
  expect(grupos.map((g) => g.item.nome)).toEqual(['Açúcar'])
})

test('busca pela igreja', () => {
  const grupos = agruparContribuicoes(ITENS, CONTRIBS, 'jose amandio')
  expect(grupos.map((g) => [g.item.nome, g.contribuicoes.length])).toEqual([['Leite', 1]])
})
