import {
  buildMealCatalog,
  type CatalogMap,
  type MealKey,
  type SheetRow,
  EMPTY_CATALOG,
} from '@/data/ingredients'

type ApiMealPayload = {
  items?: SheetRow[]
  [key: string]: unknown
}

type SyncResponse = {
  Cafe?: ApiMealPayload
  Almoco?: ApiMealPayload
  ok?: boolean
  error?: string
}

export type ContributePayload = {
  sheet: MealKey
  /** Item principal (recebe o log na coluna D) */
  nome: string
  /** Linha para coluna D */
  logLine: string
  /** Totais a gravar na coluna C (inclui sabores se houver) */
  updates: Record<string, string>
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

function normalizeCatalog(data: SyncResponse): CatalogMap {
  const result: CatalogMap = {
    Cafe: { items: [], quantities: {}, contributions: [] },
    Almoco: { items: [], quantities: {}, contributions: [] },
  }

  for (const meal of ['Cafe', 'Almoco'] as MealKey[]) {
    const payload = data[meal]
    if (!payload) continue

    if (isSheetRowArray(payload.items)) {
      result[meal] = buildMealCatalog(payload.items, meal)
      continue
    }

    if (typeof payload === 'object' && !Array.isArray(payload)) {
      const rows: SheetRow[] = Object.entries(payload)
        .filter(([key]) => key !== 'items')
        .filter(([, value]) => typeof value === 'string')
        .map(([nome, qtdEntrou]) => ({
          nome,
          qtdNecessaria: '',
          qtdEntrou: String(qtdEntrou),
        }))
      result[meal] = buildMealCatalog(rows, meal)
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
  if (data.error) throw new Error(data.error)
  return normalizeCatalog(data)
}

export async function submitContribution(
  payload: ContributePayload,
): Promise<CatalogMap> {
  const url = new URL(ensureApiUrl())
  url.searchParams.set('action', 'contribute')
  url.searchParams.set('sheet', payload.sheet)
  url.searchParams.set('nome', payload.nome)
  url.searchParams.set('logLine', payload.logLine)
  url.searchParams.set('updates', JSON.stringify(payload.updates))

  const data = await requestJson(url.toString())
  if (data.error || data.ok === false) {
    throw new Error(data.error ?? 'Erro ao salvar contribuição')
  }
  return normalizeCatalog(data)
}

export function isApiConfigured(): boolean {
  return Boolean(API_URL?.trim())
}

export type { CatalogMap }
export { EMPTY_CATALOG }
