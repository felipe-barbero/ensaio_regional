import { expect, test } from 'vitest'

import { lerContribuinte, salvarContribuinte } from './contribuinte'

function memoria(): Storage {
  const dados = new Map<string, string>()
  return {
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
    clear: () => dados.clear(),
    key: () => null,
    get length() {
      return dados.size
    },
  }
}

test('salva e lê nome e igreja', () => {
  const s = memoria()
  salvarContribuinte({ pessoa: 'Felipe', igrejaId: 'g1' }, s)
  expect(lerContribuinte(s)).toEqual({ pessoa: 'Felipe', igrejaId: 'g1' })
})

test('sem nada salvo devolve null', () => {
  expect(lerContribuinte(memoria())).toBeNull()
})

test('JSON inválido devolve null', () => {
  const s = memoria()
  s.setItem('ensaio-regional:contribuinte', '{quebrado')
  expect(lerContribuinte(s)).toBeNull()
})

test('storage indisponível não quebra', () => {
  const quebrado = {
    getItem: () => {
      throw new Error('bloqueado')
    },
    setItem: () => {
      throw new Error('bloqueado')
    },
  } as unknown as Storage
  expect(lerContribuinte(quebrado)).toBeNull()
  expect(() => salvarContribuinte({ pessoa: 'A', igrejaId: 'g' }, quebrado)).not.toThrow()
})
