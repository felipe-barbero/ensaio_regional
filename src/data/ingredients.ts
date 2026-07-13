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

export const MEAL_LABELS: Record<MealKey, string> = {
  Cafe: 'Café da Manhã',
  Almoco: 'Almoço',
}

export const INGREDIENTS: Record<MealKey, Ingredient[]> = {
  Cafe: [
    { nome: 'Açúcar', qtdNecessaria: '10 kg' },
    { nome: 'Café', qtdNecessaria: '4 pc' },
    { nome: 'Leite', qtdNecessaria: '36 L' },
    { nome: 'Nescau', qtdNecessaria: '5 pc' },
    { nome: 'Presunto', qtdNecessaria: '2 kg' },
    { nome: 'Queijo fatiado', qtdNecessaria: '2 kg' },
    { nome: 'Melancia', qtdNecessaria: '4 un' },
    { nome: 'Banana', qtdNecessaria: '3 kg' },
    { nome: 'Uva', qtdNecessaria: '5 kg' },
    { nome: 'Laranja', qtdNecessaria: '5 kg' },
    {
      nome: 'Bolo',
      qtdNecessaria: '18 un',
      sabores: ['Chocolate', 'Cenoura', 'Cuca'],
    },
    { nome: 'Pão', qtdNecessaria: '500 un' },
    { nome: 'Bandeja para café', qtdNecessaria: '400 un' },
    { nome: 'Copo descartável', qtdNecessaria: '400 un' },
    { nome: 'Guardanapos', qtdNecessaria: '1 un' },
    { nome: 'Luva', qtdNecessaria: '1 cx' },
    { nome: 'Touca', qtdNecessaria: '1 pc' },
    { nome: 'Máscara', qtdNecessaria: '1 cx' },
  ],
  Almoco: [
    { nome: 'Refrigerante', qtdNecessaria: '40 un' },
    { nome: 'Marmita 500 ml', qtdNecessaria: '200 un' },
    { nome: 'Marmita 750 ml', qtdNecessaria: '200 un' },
    { nome: 'Garfos', qtdNecessaria: '400 un' },
    { nome: 'Colheres', qtdNecessaria: '400 un' },
  ],
}

export function flavorStorageKey(nome: string, sabor: string): string {
  return `${nome}::${sabor}`
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
    .match(/\d+(?:[.,]\d+)?\s*(kg|l|un|pc|pct|cx|ml)\b/i)
  if (!match) return ''
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
