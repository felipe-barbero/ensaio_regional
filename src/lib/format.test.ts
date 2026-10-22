import { expect, test } from 'vitest'

import { formatData } from './format'

test('formatData não sofre com fuso horário', () => {
  expect(formatData('2026-11-01')).toBe('01/11/2026')
})
