import { expect, test } from 'vitest'

import {
  buildImportPayload,
  parseLogLine,
  parseQtdNecessaria,
} from './sheets-parse'

const IGREJAS = ['Bombas', 'José Amândio', 'Zimbros']
const OPTS = {
  regiao: 'Bombinhas',
  igrejas: IGREJAS,
  nome: 'Ensaio Regional Bombinhas',
  slug: 'bombinhas-2026-11-15',
  data: '2026-11-15',
}

test('parseQtdNecessaria', () => {
  expect(parseQtdNecessaria('10 kg')).toEqual({ qtd: 10, unidade: 'kg' })
  expect(parseQtdNecessaria('4 pc')).toEqual({ qtd: 4, unidade: 'pct' })
  expect(parseQtdNecessaria('36 L')).toEqual({ qtd: 36, unidade: 'L' })
  expect(parseQtdNecessaria('36 l')).toEqual({ qtd: 36, unidade: 'L' })
  expect(parseQtdNecessaria('1 cx')).toEqual({ qtd: 1, unidade: 'cx' })
  expect(parseQtdNecessaria('')).toEqual({ qtd: null, unidade: '' })
})

test('parseLogLine', () => {
  expect(parseLogLine('Felipe - Zimbros - 3pct', IGREJAS)).toEqual({
    pessoa: 'Felipe',
    igreja: 'Zimbros',
    quantidade: 3,
  })
  expect(parseLogLine('Ana - José Amândio - 1.5kg', IGREJAS)?.quantidade).toBe(1.5)
  expect(parseLogLine('Anderson - Jose Amandio - 20 L', IGREJAS)).toEqual({
    pessoa: 'Anderson',
    igreja: 'José Amândio',
    quantidade: 20,
  })
  expect(parseLogLine('Ana - Itajaí - 2un', IGREJAS)).toBeNull()
  expect(parseLogLine('texto solto', IGREJAS)).toBeNull()
})

test('buildImportPayload converte itens, sabores, contribuições e ajustes', () => {
  const sheet = {
    Cafe: {
      items: [
        { nome: 'Açúcar', qtdNecessaria: '10 kg', qtdEntrou: '5 kg', contribuicoes: 'Felipe - Zimbros - 3kg' },
        { nome: 'Bolo', qtdNecessaria: '18 un', qtdEntrou: '', sabores: 'Chocolate, Cenoura' },
        { nome: 'Bolo::Chocolate', qtdNecessaria: '', qtdEntrou: '4' },
        { nome: 'Bolo::Cenoura', qtdNecessaria: '', qtdEntrou: '2' },
      ],
    },
    Almoco: { items: [] },
  }
  const { payload, report } = buildImportPayload(sheet, OPTS)

  expect(payload.regiao).toBe('Bombinhas')
  expect(payload.igrejas).toEqual(IGREJAS)
  expect(payload.ensaio).toEqual({
    nome: 'Ensaio Regional Bombinhas',
    slug: 'bombinhas-2026-11-15',
    data: '2026-11-15',
  })
  expect(payload.itens.map((i) => [i.nome, i.ordem])).toEqual([
    ['Açúcar', 0],
    ['Bolo', 1],
  ])
  expect(payload.itens[1].sabores).toEqual(['Chocolate', 'Cenoura'])
  expect(payload.itens[0].contribuicoes).toEqual([
    { pessoa: 'Felipe', igreja: 'Zimbros', quantidade: 3, origem: 'importado' },
    { pessoa: 'Ajuste importado', igreja: null, quantidade: 2, origem: 'ajuste' },
  ])
  expect(payload.itens[1].contribuicoes).toEqual([
    { pessoa: 'Ajuste importado', igreja: null, quantidade: 6, origem: 'ajuste' },
  ])
  expect(report.divergencias).toEqual([])
})

test('buildImportPayload aponta divergência quando o log passa do total', () => {
  const sheet = {
    Cafe: {
      items: [
        { nome: 'Açúcar', qtdNecessaria: '10 kg', qtdEntrou: '2 kg', contribuicoes: 'Felipe - Zimbros - 5kg' },
      ],
    },
    Almoco: { items: [] },
  }
  const { report } = buildImportPayload(sheet, OPTS)
  expect(report.divergencias).toEqual([
    { item: 'Açúcar', planilha: 2, importado: 5 },
  ])
})

test('buildImportPayload lista linhas ignoradas e elas entram no ajuste', () => {
  const sheet = {
    Cafe: {
      items: [
        { nome: 'Pão', qtdNecessaria: '500 un', qtdEntrou: '10', contribuicoes: 'Ana - Itajaí - 4un\nBia - Bombas - 6un' },
      ],
    },
    Almoco: { items: [] },
  }
  const { payload, report } = buildImportPayload(sheet, OPTS)
  expect(report.linhasIgnoradas).toEqual(['Pão: Ana - Itajaí - 4un'])
  expect(payload.itens[0].contribuicoes).toEqual([
    { pessoa: 'Bia', igreja: 'Bombas', quantidade: 6, origem: 'importado' },
    { pessoa: 'Ajuste importado', igreja: null, quantidade: 4, origem: 'ajuste' },
  ])
})

test('parseQtdNecessaria com unidade colada no número', () => {
  expect(parseQtdNecessaria('10kg')).toEqual({ qtd: 10, unidade: 'kg' })
  expect(parseQtdNecessaria('5L')).toEqual({ qtd: 5, unidade: 'L' })
  expect(parseQtdNecessaria('4pct')).toEqual({ qtd: 4, unidade: 'pct' })
})

test('buildImportPayload ignora sabores numéricos (resto da planilha antiga)', () => {
  const sheet = {
    Cafe: { items: [] },
    Almoco: {
      items: [
        { nome: 'Feijão Preto', qtdNecessaria: '10 kg', qtdEntrou: '1 kg', sabores: '14' },
        { nome: 'Feijão Preto::14', qtdNecessaria: '', qtdEntrou: '1 kg' },
      ],
    },
  }
  const { payload } = buildImportPayload(sheet, OPTS)
  expect(payload.itens).toHaveLength(1)
  expect(payload.itens[0].sabores).toEqual([])
})

test('buildImportPayload mantém unidade desconhecida no nome', () => {
  const sheet = {
    Cafe: { items: [] },
    Almoco: {
      items: [
        { nome: 'Couve folha', qtdNecessaria: '10 maços', qtdEntrou: '10' },
        { nome: 'Marmitas 500 ml', qtdNecessaria: '200', qtdEntrou: '200' },
      ],
    },
  }
  const { payload } = buildImportPayload(sheet, OPTS)
  expect(payload.itens.map((i) => [i.nome, i.qtd_necessaria, i.unidade])).toEqual([
    ['Couve folha (maços)', 10, ''],
    ['Marmitas 500 ml', 200, ''],
  ])
})
