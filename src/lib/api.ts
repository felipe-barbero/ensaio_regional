import {
  buildMealCatalog,
  type CatalogMap,
  type MealKey,
  type SheetRow,
  EMPTY_CATALOG,
} from '@/data/ingredients'

type ApiMealPayload = {
  items?: SheetRow[]
  /** Formato antigo: mapa nome → qtd */
  [key: string]: unknown
}

type SyncResponse = {
  Cafe?: ApiMealPayload
  Almoco?: ApiMealPayload
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

function isSheetRowArray(value: unknown): value is SheetRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row &&
        typeof row === 'object' &&
        'nome' in row &&
        typeof (row as SheetRow).nome === 'string',
    )
  )
}

/** Aceita formato novo (items[]) e antigo (mapa de quantidades). */
function normalizeCatalog(data: SyncResponse): CatalogMap {
  const result: CatalogMap = {
    Cafe: { items: [], quantities: {} },
    Almoco: { items: [], quantities: {} },
  }

  for (const meal of ['Cafe', 'Almoco'] as MealKey[]) {
    const payload = data[meal]
    if (!payload) continue

    if (isSheetRowArray(payload.items)) {
      result[meal] = buildMealCatalog(payload.items)
      continue
    }

    // Retrocompat: { "Açúcar": "1 kg", ... }
    if (typeof payload === 'object' && !Array.isArray(payload)) {
      const rows: SheetRow[] = Object.entries(payload)
        .filter(([key]) => key !== 'items')
        .filter(([, value]) => typeof value === 'string')
        .map(([nome, qtdEntrou]) => ({
          nome,
          qtdNecessaria: '',
          qtdEntrou: String(qtdEntrou),
        }))
      result[meal] = buildMealCatalog(rows)
    }
  }

  return result
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

export async function fetchCatalog(): Promise<CatalogMap> {
  const url = new URL(ensureApiUrl())
  url.searchParams.set('action', 'get')

  const data = await requestJson(url.toString())
  if (data.error) {
    throw new Error(data.error)
  }
  return normalizeCatalog(data)
}

/** @deprecated use fetchCatalog */
export async function fetchQuantities(): Promise<CatalogMap> {
  return fetchCatalog()
}

/** Salva 1 ou N itens e devolve o catálogo atualizado (1 request). */
export async function updateQuantities(
  sheet: MealKey,
  updates: Record<string, string>,
): Promise<CatalogMap> {
  const entries = Object.entries(updates)
  if (entries.length === 0) {
    return fetchCatalog()
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

  return normalizeCatalog(data)
}

export function isApiConfigured(): boolean {
  return Boolean(API_URL?.trim())
}

export type { CatalogMap }
export { EMPTY_CATALOG }
