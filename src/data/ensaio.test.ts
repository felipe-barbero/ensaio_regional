import { expect, test } from 'vitest'

import {
  formatContributionPhrase,
  formatNecessario,
  formatQty,
  isItemCompleto,
  itemFalta,
  itemTotal,
  mealProgress,
  parseSaboresInput,
  parseQuantidadeInput,
  saborTotal,
  type Contribuicao,
  type Item,
} from './ensaio'

const bolo: Item = {
  id: 'b',
  refeicao: 'cafe',
  nome: 'Bolo',
  qtdNecessaria: 18,
  unidade: 'un',
  sabores: ['Chocolate', 'Cenoura'],
  ordem: 0,
}
const acucar: Item = {
  id: 'a',
  refeicao: 'cafe',
  nome: 'Açúcar',
  qtdNecessaria: 10,
  unidade: 'kg',
  sabores: [],
  ordem: 1,
}
const c = (
  itemId: string,
  quantidade: number,
  sabor: string | null = null,
): Contribuicao => ({
  id: crypto.randomUUID(),
  itemId,
  igrejaId: 'i',
  igrejaNome: 'Zimbros',
  pessoa: 'Felipe',
  sabor,
  quantidade,
  origem: 'link',
  criadoEm: '2026-10-22T10:00:00Z',
})

test('itemTotal soma só o item', () => {
  expect(itemTotal(acucar, [c('a', 2), c('a', 3), c('b', 5)])).toBe(5)
})

test('soma decimal sem erro de ponto flutuante', () => {
  const total = itemTotal(acucar, [c('a', 0.1), c('a', 0.2)])
  expect(total).toBe(0.3)
  expect(formatQty(total, 'kg')).toBe('0.3 kg')
})

test('saborTotal filtra por sabor e null = sabor não informado', () => {
  const cs = [c('b', 2, 'Chocolate'), c('b', 3, 'Cenoura'), c('b', 4, null)]
  expect(saborTotal(bolo, 'Chocolate', cs)).toBe(2)
  expect(saborTotal(bolo, null, cs)).toBe(4)
  expect(itemTotal(bolo, cs)).toBe(9)
})

test('itemFalta e completo', () => {
  expect(itemFalta(acucar, [c('a', 4)])).toBe(6)
  expect(itemFalta(acucar, [c('a', 12)])).toBe(0)
  expect(itemFalta({ ...acucar, qtdNecessaria: null }, [])).toBeNull()
  expect(isItemCompleto({ ...acucar, qtdNecessaria: null }, [c('a', 1)])).toBe(true)
  expect(isItemCompleto({ ...acucar, qtdNecessaria: null }, [])).toBe(false)
})

test('mealProgress', () => {
  expect(mealProgress([bolo, acucar], [c('a', 10)])).toEqual({
    complete: 1,
    total: 2,
    pct: 50,
    missingCount: 1,
  })
})

test('parseQuantidadeInput', () => {
  expect(parseQuantidadeInput('1,5', 'kg')).toBe(1.5)
  expect(parseQuantidadeInput('1,5', 'un')).toBeNull()
  expect(parseQuantidadeInput('3', 'pct')).toBe(3)
  expect(parseQuantidadeInput('0', 'kg')).toBeNull()
  expect(parseQuantidadeInput('-2', 'kg')).toBeNull()
  expect(parseQuantidadeInput('abc', 'kg')).toBeNull()
  expect(parseQuantidadeInput('1.2345', 'kg')).toBeNull()
})

test('formatQty e formatNecessario', () => {
  expect(formatQty(3, 'pct')).toBe('3 pct')
  expect(formatQty(2, '')).toBe('2')
  expect(formatNecessario(acucar)).toBe('10 kg')
  expect(formatNecessario({ ...acucar, qtdNecessaria: null })).toBe('—')
})

test('formatContributionPhrase', () => {
  expect(formatContributionPhrase(c('b', 3, 'Chocolate'), bolo)).toBe(
    'Deus preparou 3un de Bolo (Chocolate) para o Café da Manhã.',
  )
})

test('parseSaboresInput apara, remove vazios e duplicados', () => {
  expect(parseSaboresInput(' Chocolate, Cenoura,, chocolate ,Cuca ')).toEqual([
    'Chocolate',
    'Cenoura',
    'Cuca',
  ])
  expect(parseSaboresInput('   ')).toEqual([])
})
