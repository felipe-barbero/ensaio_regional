import { expect, test } from 'vitest'

import { gerarSlug, normalizarSlug, slugDigitando, slugUnico } from './slug'

test('gerarSlug', () => {
  expect(gerarSlug('Itapema', '2026-10-10')).toBe('itapema-2026-10-10')
  expect(gerarSlug('José Amândio', '2026-11-01')).toBe('jose-amandio-2026-11-01')
  expect(gerarSlug('  Balneário  Camboriú ', '2026-01-05')).toBe(
    'balneario-camboriu-2026-01-05',
  )
})

test('normalizarSlug', () => {
  expect(normalizarSlug('Itapema 2026/10/10!')).toBe('itapema-2026-10-10')
})

test('slugUnico', () => {
  expect(slugUnico('itapema-2026-10-10', [])).toBe('itapema-2026-10-10')
  expect(slugUnico('itapema-2026-10-10', ['itapema-2026-10-10'])).toBe(
    'itapema-2026-10-10-2',
  )
  expect(
    slugUnico('itapema-2026-10-10', [
      'itapema-2026-10-10',
      'itapema-2026-10-10-2',
    ]),
  ).toBe('itapema-2026-10-10-3')
})

test('slugDigitando mantém o hífen final enquanto o admin digita', () => {
  expect(slugDigitando('itapema-')).toBe('itapema-')
  expect(slugDigitando('Itapema Sul')).toBe('itapema-sul')
  expect(slugDigitando('Itapema ')).toBe('itapema-')
  expect(slugDigitando('-itapema')).toBe('itapema')
})
