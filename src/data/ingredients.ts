export type MealKey = 'Cafe' | 'Almoco'

export type Unit = 'kg' | 'L' | 'un' | 'pc' | 'cx' | 'ml' | ''

export const CONGREGACOES = ['Bombas', 'José Amândio', 'Zimbros'] as const
export type Congregacao = (typeof CONGREGACOES)[number]

export type Ingredient = {
  nome: string
  qtdNecessaria: string
  editavel?: boolean
  sabores?: string[]
  /** Texto bruto da coluna D (log de contribuições) */
  contribuicoesTexto?: string
}

export type SheetRow = {
  nome: string
  qtdNecessaria: string
  qtdEntrou: string
  /** Coluna D — log de contribuições */
  contribuicoes?: string
  /** Coluna E — sabores opcionais */
  sabores?: string
}

export type ContributionEntry = {
  pessoa: string
  congregacao: Congregacao
  qtdLabel: string
  ingredientNome: string
  meal: MealKey
  sabor?: string
}

export type MealCatalog = {
  items: Ingredient[]
  quantities: Record<string, string>
  contributions: ContributionEntry[]
}

export type CatalogMap = Record<MealKey, MealCatalog>

export const MEAL_LABELS: Record<MealKey, string> = {
  Cafe: 'Café da Manhã',
  Almoco: 'Almoço',
}

export const EMPTY_CATALOG: CatalogMap = {
  Cafe: { items: [], quantities: {}, contributions: [] },
  Almoco: { items: [], quantities: {}, contributions: [] },
}

export function flavorStorageKey(nome: string, sabor: string): string {
  return `${nome}::${sabor}`
}

export function congregacaoPreposition(c: Congregacao): 'de' | 'do' {
  return c === 'Bombas' ? 'de' : 'do'
}

/** Unidade para texto/planilha (pc → pct, como pedido) */
export function displayUnit(unit: Unit): string {
  if (unit === 'pc') return 'pct'
  return unit
}

function parseSaboresField(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;/|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isCongregacao(value: string): value is Congregacao {
  return (CONGREGACOES as readonly string[]).includes(value)
}

/** Parseia linhas da coluna D: "Felipe - Zimbros - 3pct" */
export function parseContributionLines(
  text: string | undefined,
  ingredientNome: string,
  meal: MealKey,
): ContributionEntry[] {
  if (!text?.trim()) return []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const entries: ContributionEntry[] = []
  for (const line of lines) {
    const parts = line.split(' - ').map((p) => p.trim())
    if (parts.length >= 3) {
      const pessoa = parts[0]
      const congregacaoRaw = parts[1]
      const qtdLabel = parts.slice(2).join(' - ')
      if (!isCongregacao(congregacaoRaw)) continue
      entries.push({
        pessoa,
        congregacao: congregacaoRaw,
        qtdLabel,
        ingredientNome,
        meal,
      })
      continue
    }
  }
  return entries
}

export function formatLogLine(
  pessoa: string,
  congregacao: Congregacao,
  amount: number,
  unit: Unit,
  integer: boolean,
): string {
  const n = integer ? Math.round(amount) : Math.round(amount * 1000) / 1000
  const u = displayUnit(unit)
  const qty = u ? `${n}${u}` : String(n)
  return `${pessoa.trim()} - ${congregacao} - ${qty}`
}

export function formatContributionPhrase(entry: ContributionEntry): string {
  const prep = congregacaoPreposition(entry.congregacao)
  const item = entry.sabor
    ? `${entry.ingredientNome} (${entry.sabor})`
    : entry.ingredientNome
  return `${entry.pessoa} ${prep} ${entry.congregacao} contribuiu com ${entry.qtdLabel} de ${item.toLowerCase()}.`
}

export function buildMealCatalog(
  rows: SheetRow[],
  meal: MealKey,
): MealCatalog {
  const quantities: Record<string, string> = {}
  const flavorsByParent: Record<string, string[]> = {}
  const contributions: ContributionEntry[] = []

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
    const texto = row.contribuicoes?.trim() ?? ''

    contributions.push(...parseContributionLines(texto, nome, meal))

    items.push({
      nome,
      qtdNecessaria: row.qtdNecessaria ?? '',
      contribuicoesTexto: texto,
      ...(sabores.length > 0 ? { sabores } : {}),
    })
  }

  return { items, quantities, contributions }
}

export function parseRequiredQty(qtdNecessaria: string): number | null {
  const match = qtdNecessaria.trim().match(/^(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  return Number(match[1].replace(',', '.'))
}

export function parseUnit(qtdNecessaria: string): Unit {
  const withNumber = qtdNecessaria
    .trim()
    .match(/\d+(?:[.,]\d+)?\s*(kg|l|un|pc|pct|cx|ml)\b/i)
  if (withNumber) {
    const raw = withNumber[1].toLowerCase()
    if (raw === 'l') return 'L'
    if (raw === 'pct') return 'pc'
    return raw as Unit
  }
  const match = qtdNecessaria.trim().match(/\b(kg|l|un|pc|pct|cx|ml)\b/i)
  if (!match) return ''
  const raw = match[1].toLowerCase()
  if (raw === 'l') return 'L'
  if (raw === 'pct') return 'pc'
  return raw as Unit
}

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
  const u = displayUnit(unit)
  return u ? `${text} ${u}` : text
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

export function mealProgress(
  items: Ingredient[],
  quantities: Record<string, string>,
): { complete: number; total: number; pct: number; missingCount: number } {
  const editable = items.filter((i) => i.editavel !== false)
  let complete = 0
  for (const item of editable) {
    const required = parseRequiredQty(item.qtdNecessaria)
    const got = getItemTotal(item, quantities)
    if (required == null) {
      if (got > 0) complete += 1
    } else if (got >= required) {
      complete += 1
    }
  }
  const total = editable.length
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100)
  return { complete, total, pct, missingCount: total - complete }
}
