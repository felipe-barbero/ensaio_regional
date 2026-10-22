// Lembra nome e igreja de quem contribui, só neste aparelho.
// Conveniência: se o storage estiver bloqueado, o formulário só começa vazio.

const KEY = 'ensaio-regional:contribuinte'

export type Contribuinte = { pessoa: string; igrejaId: string }

function storagePadrao(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function lerContribuinte(storage = storagePadrao()): Contribuinte | null {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Contribuinte>
    if (typeof data.pessoa !== 'string' || typeof data.igrejaId !== 'string') return null
    return { pessoa: data.pessoa, igrejaId: data.igrejaId }
  } catch {
    return null
  }
}

export function salvarContribuinte(c: Contribuinte, storage = storagePadrao()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(c))
  } catch {
    // sem storage: segue sem lembrar
  }
}
