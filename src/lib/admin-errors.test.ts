import { expect, test } from 'vitest'

import { toMensagem } from './admin-errors'

test('slug duplicado', () => {
  expect(
    toMensagem({
      code: '23505',
      message: 'duplicate key value violates unique constraint "ensaios_slug_key"',
    }),
  ).toBe('Já existe um ensaio com esse link')
})

test('item duplicado na refeição', () => {
  expect(
    toMensagem({
      code: '23505',
      message:
        'duplicate key value violates unique constraint "itens_ensaio_id_refeicao_nome_key"',
    }),
  ).toBe('Já existe um item com esse nome nesta refeição')
})

test('região ou igreja duplicada', () => {
  expect(
    toMensagem({
      code: '23505',
      message: 'duplicate key value violates unique constraint "regioes_nome_key"',
    }),
  ).toBe('Já existe um cadastro com esse nome')
  expect(
    toMensagem({
      code: '23505',
      message:
        'duplicate key value violates unique constraint "igrejas_regiao_id_nome_key"',
    }),
  ).toBe('Já existe um cadastro com esse nome')
})

test('em uso (FK restrict)', () => {
  expect(
    toMensagem({ code: '23503', message: 'update or delete on table "igrejas"' }),
  ).toBe('Não é possível excluir: está em uso por ensaios ou contribuições')
})

test('check violado', () => {
  expect(toMensagem({ code: '23514', message: 'new row violates check' })).toBe(
    'Valor inválido',
  )
})

test('fallback usa a mensagem original', () => {
  expect(toMensagem({ code: 'PGRST301', message: 'JWT expired' })).toBe(
    'JWT expired',
  )
})
