export type MealKey = 'Cafe' | 'Almoco'

export type Unit = 'kg' | 'L' | 'un' | 'pc' | 'cx' | 'ml' | ''

export type Ingredient = {
  nome: string
  qtdNecessaria: string
  /** Se false, não há quantidade numérica */
  editavel?: boolean
  /** Sabores selecionáveis via radio ao contribuir */
  sabores?: string[]
}

/** Linha crua vinda da planilha */
export type SheetRow = {
  nome: string
  qtdNecessaria: string
  qtdEntrou: string
  sabores?: string
}

export type MealCatalog = {
  items: Ingredient[]
  quantities: Record<string, string>
}

export type CatalogMap = Record<MealKey, MealCatalog>

export const MEAL_LABELS: Record<MealKey, string> = {
  Cafe: 'Café da Manhã',
  Almoco: 'Almoço',
}

export const EMPTY_CATALOG: CatalogMap = {
  Cafe: { items: [], quantities: {} },
  Almoco: { items: [], quantities: {} },
}

export function flavorStorageKey(nome: string, sabor: string): string {
  return `${nome}::${sabor}`
}

function parseSaboresField(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;/|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Monta lista exibida + mapa de quantidades a partir das linhas da planilha */
export function buildMealCatalog(rows: SheetRow[]): MealCatalog {
  const quantities: Record<string, string> = {}
  const flavorsByParent: Record<string, string[]> = {}

  for (const row of rows) {
    const nome = row.nome.trim()
    if (!nome) continue
    quantities[nome] = row.qtdEntrou ?? ''

    if (nome.includes('::')) {
      const [parent, flavor] = nome.split('::')
      const p = parent.trim()
      const f = flavor.trim()
      if (p && f) {
        flavorsByParent[p] = [...(flavorsByParent[p] ?? []), f]
      }
    }
  }

  const items: Ingredient[] = []
  for (const row of rows) {
    const nome = row.nome.trim()
    if (!nome || nome.includes('::')) continue

    const fromColumn = parseSaboresField(row.sabores)
    const fromChildren = flavorsByParent[nome] ?? []
    const sabores = fromColumn.length > 0 ? fromColumn : fromChildren

    items.push({
      nome,
      qtdNecessaria: row.qtdNecessaria ?? '',
      ...(sabores.length > 0 ? { sabores } : {}),
    })
  }

  return { items, quantities }
}

/** Extrai o número da qtd necessária para comparar com o que entrou */
export function parseRequiredQty(qtdNecessaria: string): number | null {
  const match = qtdNecessaria.trim().match(/^(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  return Number(match[1].replace(',', '.'))
}

export function parseUnit(qtdNecessaria: string): Unit {
  const match = qtdNecessaria
    .trim()
    .match(/(?:^|\s)(kg|l|un|pc|pct|cx|ml)\b/i)
  if (!match) {
    // tenta padrão "10 kg"
    const withNumber = qtdNecessaria
      .trim()
      .match(/\d+(?:[.,]\d+)?\s*(kg|l|un|pc|pct|cx|ml)\b/i)
    if (!withNumber) return ''
    const raw = withNumber[1].toLowerCase()
    if (raw === 'l') return 'L'
    if (raw === 'pct') return 'pc'
    return raw as Unit
  }
  const raw = match[1].toLowerCase()
  if (raw === 'l') return 'L'
  if (raw === 'pct') return 'pc'
  return raw as Unit
}

/** un, pc, cx, ml → inteiros; kg e L → decimais */
export function isIntegerUnit(unit: Unit): boolean {
  return unit === 'un' || unit === 'pc' || unit === 'cx' || unit === 'ml' || unit === ''
}

export function parseEnteredQty(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  return Number(match[1].replace(',', '.'))
}

export function formatQty(value: number, unit: Unit, integer: boolean): string {
  const n = integer ? Math.round(value) : Math.round(value * 1000) / 1000
  const text = Number.isInteger(n) ? String(n) : String(n)
  return unit ? `${text} ${unit}` : text
}

export function getItemTotal(
  item: Ingredient,
  quantities: Record<string, string>,
): number {
  const legacy = parseEnteredQty(quantities[item.nome] ?? '') ?? 0

  if (item.sabores?.length) {
    const flavorSum = item.sabores.reduce((sum, sabor) => {
      const key = flavorStorageKey(item.nome, sabor)
      return sum + (parseEnteredQty(quantities[key] ?? '') ?? 0)
    }, 0)
    return flavorSum > 0 ? flavorSum : legacy
  }

  return legacy
}

export function getFlavorQty(
  item: Ingredient,
  sabor: string,
  quantities: Record<string, string>,
): number {
  return parseEnteredQty(quantities[flavorStorageKey(item.nome, sabor)] ?? '') ?? 0
}
