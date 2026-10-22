import { expect, test } from 'vitest'

import { ensaioUrl } from './links'

const ORIGIN = 'https://felipe-barbero.github.io'

test('link do café', () => {
  expect(ensaioUrl('itapema-2026-10-10', 'cafe', ORIGIN)).toBe(
    'https://felipe-barbero.github.io/ensaio_regional/e/itapema-2026-10-10/cafe',
  )
})

test('link do almoço', () => {
  expect(ensaioUrl('itapema-2026-10-10', 'almoco', ORIGIN)).toBe(
    'https://felipe-barbero.github.io/ensaio_regional/e/itapema-2026-10-10/almoco',
  )
})

test('link do resumo não tem sufixo', () => {
  expect(ensaioUrl('itapema-2026-10-10', 'resumo', ORIGIN)).toBe(
    'https://felipe-barbero.github.io/ensaio_regional/e/itapema-2026-10-10',
  )
})
