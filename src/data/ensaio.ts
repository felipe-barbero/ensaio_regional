export type MealKey = 'cafe' | 'almoco'

export type Unit = 'kg' | 'L' | 'un' | 'pct' | 'cx' | 'ml' | ''

export type Origem = 'link' | 'importado' | 'ajuste'

export type StatusEnsaio = 'aberto' | 'encerrado'

export type Regiao = { id: string; nome: string }

export type Igreja = { id: string; nome: string }

export type Ensaio = {
  id: string
  nome: string
  slug: string
  /** AAAA-MM-DD */
  data: string
  status: StatusEnsaio
  regiao: Regiao
}

export type Item = {
  id: string
  refeicao: MealKey
  nome: string
  qtdNecessaria: number | null
  unidade: Unit
  sabores: string[]
  ordem: number
}

export type Contribuicao = {
  id: string
  itemId: string
  igrejaId: string | null
  igrejaNome: string | null
  pessoa: string
  sabor: string | null
  quantidade: number
  origem: Origem
  criadoEm: string
}

export type EnsaioPublico = {
  ensaio: Ensaio
  igrejas: Igreja[]
  itens: Item[]
  contribuicoes: Contribuicao[]
}

export type ContribuirInput = {
  itemId: string
  igrejaId: string
  pessoa: string
  sabor: string | null
  quantidade: number
}

export const MEAL_LABELS: Record<MealKey, string> = {
  cafe: 'Café da Manhã',
  almoco: 'Almoço',
}

export const UNITS: Unit[] = ['kg', 'L', 'un', 'pct', 'cx', 'ml', '']

export function isIntegerUnit(u: Unit): boolean {
  return u !== 'kg' && u !== 'L'
}

/** Arredonda para 3 casas (evita 0.30000000000000004) */
export function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function itemTotal(item: Item, contribs: Contribuicao[]): number {
  return roundQty(
    contribs
      .filter((c) => c.itemId === item.id)
      .reduce((sum, c) => sum + c.quantidade, 0),
  )
}

/** sabor null = contribuições sem sabor informado */
export function saborTotal(
  item: Item,
  sabor: string | null,
  contribs: Contribuicao[],
): number {
  return roundQty(
    contribs
      .filter((c) => c.itemId === item.id && c.sabor === sabor)
      .reduce((sum, c) => sum + c.quantidade, 0),
  )
}

export function itemFalta(item: Item, contribs: Contribuicao[]): number | null {
  if (item.qtdNecessaria == null) return null
  return Math.max(0, roundQty(item.qtdNecessaria - itemTotal(item, contribs)))
}

export function isItemCompleto(item: Item, contribs: Contribuicao[]): boolean {
  const falta = itemFalta(item, contribs)
  if (falta == null) return itemTotal(item, contribs) > 0
  return falta === 0
}

export function mealProgress(
  itens: Item[],
  contribs: Contribuicao[],
): { complete: number; total: number; pct: number; missingCount: number } {
  const complete = itens.filter((i) => isItemCompleto(i, contribs)).length
  const total = itens.length
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100)
  return { complete, total, pct, missingCount: total - complete }
}

export function formatQty(n: number, u: Unit): string {
  const text = String(roundQty(n))
  return u ? `${text} ${u}` : text
}

export function formatNecessario(item: Item): string {
  if (item.qtdNecessaria == null) return '—'
  return formatQty(item.qtdNecessaria, item.unidade)
}

/** Aceita vírgula decimal; null se inválido para a unidade */
export function parseQuantidadeInput(raw: string, u: Unit): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  if (isIntegerUnit(u) && !Number.isInteger(value)) return null
  if (roundQty(value) !== value) return null
  return value
}

export function formatContributionPhrase(c: Contribuicao, item: Item): string {
  const qty = `${roundQty(c.quantidade)}${item.unidade}`
  const nome = c.sabor ? `${item.nome} (${c.sabor})` : item.nome
  return `Deus preparou ${qty} de ${nome} para o ${MEAL_LABELS[item.refeicao]}.`
}

/** "Chocolate, Cenoura" → ['Chocolate', 'Cenoura'] (sem vazios nem repetidos) */
export function parseSaboresInput(raw: string): string[] {
  const vistos = new Set<string>()
  const sabores: string[] = []
  for (const parte of raw.split(',')) {
    const sabor = parte.trim()
    const chave = sabor.toLocaleLowerCase('pt-BR')
    if (!sabor || vistos.has(chave)) continue
    vistos.add(chave)
    sabores.push(sabor)
  }
  return sabores
}
