import type { MealKey } from '@/data/ingredients'

export type QuantitiesMap = Record<MealKey, Record<string, string>>

type SyncResponse = QuantitiesMap & {
  ok?: boolean
  error?: string
}

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined

function ensureApiUrl(): string {
  if (!API_URL?.trim()) {
    throw new Error(
      'Configure VITE_APPS_SCRIPT_URL no arquivo .env (URL do Apps Script).',
    )
  }
  return API_URL.trim()
}

function normalizeMap(data: Partial<QuantitiesMap>): QuantitiesMap {
  return {
    Cafe: data.Cafe ?? {},
    Almoco: data.Almoco ?? {},
  }
}

async function requestJson(url: string): Promise<SyncResponse> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Falha na API (${response.status})`)
  }

  return (await response.json()) as SyncResponse
}

export async function fetchQuantities(): Promise<QuantitiesMap> {
  const url = new URL(ensureApiUrl())
  url.searchParams.set('action', 'get')

  const data = await requestJson(url.toString())
  if (data.error) {
    throw new Error(data.error)
  }
  return normalizeMap(data)
}

/** Salva 1 ou N itens e devolve o estado atualizado (1 request só). */
export async function updateQuantities(
  sheet: MealKey,
  updates: Record<string, string>,
): Promise<QuantitiesMap> {
  const entries = Object.entries(updates)
  if (entries.length === 0) {
    return fetchQuantities()
  }

  const url = new URL(ensureApiUrl())

  if (entries.length === 1) {
    const [nome, qtd] = entries[0]
    url.searchParams.set('action', 'set')
    url.searchParams.set('sheet', sheet)
    url.searchParams.set('nome', nome)
    url.searchParams.set('qtd', qtd)
  } else {
    url.searchParams.set('action', 'setMany')
    url.searchParams.set('sheet', sheet)
    url.searchParams.set('updates', JSON.stringify(updates))
  }

  const data = await requestJson(url.toString())
  if (data.error || data.ok === false) {
    throw new Error(data.error ?? 'Erro ao salvar na planilha')
  }

  return normalizeMap(data)
}

export async function updateQuantity(
  sheet: MealKey,
  nome: string,
  qtd: string,
): Promise<QuantitiesMap> {
  return updateQuantities(sheet, { [nome]: qtd })
}

export function isApiConfigured(): boolean {
  return Boolean(API_URL?.trim())
}
