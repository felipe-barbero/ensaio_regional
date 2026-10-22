// Converte a resposta do Apps Script (?action=get) no payload de `importar_ensaio`.
import { roundQty, type MealKey, type Unit } from '../../src/data/ensaio.ts'
import { normalizarSlug } from '../../src/lib/slug.ts'

type SheetRow = {
  nome: string
  qtdNecessaria?: string
  qtdEntrou?: string
  contribuicoes?: string
  sabores?: string
}

export type ImportContribuicao = {
  pessoa: string
  igreja: string | null
  quantidade: number
  origem: 'importado' | 'ajuste'
}

export type ImportItem = {
  refeicao: MealKey
  nome: string
  qtd_necessaria: number | null
  unidade: Unit
  sabores: string[]
  ordem: number
  contribuicoes: ImportContribuicao[]
}

export type ImportarEnsaioPayload = {
  regiao: string
  igrejas: string[]
  ensaio: { nome: string; slug: string; data: string }
  itens: ImportItem[]
}

export type ImportReport = {
  linhasIgnoradas: string[]
  divergencias: { item: string; planilha: number; importado: number }[]
  /** Total da planilha por item, para comparar depois da importação */
  totais: { refeicao: MealKey; item: string; planilha: number }[]
}

const SHEETS: [string, MealKey][] = [
  ['Cafe', 'cafe'],
  ['Almoco', 'almoco'],
]

function parseNumber(raw: string | undefined): number | null {
  const match = (raw ?? '').trim().match(/^(\d+(?:[.,]\d+)?)/)
  return match ? Number(match[1].replace(',', '.')) : null
}

function normalizeUnit(raw: string): Unit {
  const u = raw.toLowerCase()
  if (u === 'l') return 'L'
  if (u === 'pc' || u === 'pct') return 'pct'
  return u as Unit
}

export function parseQtdNecessaria(raw: string): { qtd: number | null; unidade: Unit } {
  const unit = raw.trim().match(/\b(kg|l|un|pc|pct|cx|ml)\b/i)
  return {
    qtd: parseNumber(raw),
    unidade: unit ? normalizeUnit(unit[1]) : '',
  }
}

/** "Felipe - Zimbros - 3pct" */
export function parseLogLine(
  line: string,
  igrejas: string[],
): { pessoa: string; igreja: string; quantidade: number } | null {
  const parts = line.split(' - ').map((p) => p.trim())
  if (parts.length < 3) return null
  const pessoa = parts[0]
  // "Jose Amandio" → "José Amândio"
  const igreja = igrejas.find((g) => normalizarSlug(g) === normalizarSlug(parts[1]))
  const quantidade = parseNumber(parts.slice(2).join(' - '))
  if (!pessoa || !igreja || quantidade == null || quantidade <= 0) {
    return null
  }
  return { pessoa, igreja, quantidade }
}

function splitSabores(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[,;/|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function buildImportPayload(
  sheet: unknown,
  opts: { regiao: string; igrejas: string[]; nome: string; slug: string; data: string },
): { payload: ImportarEnsaioPayload; report: ImportReport } {
  const data = (sheet ?? {}) as Record<string, { items?: SheetRow[] } | undefined>
  const report: ImportReport = { linhasIgnoradas: [], divergencias: [], totais: [] }
  const itens: ImportItem[] = []

  for (const [sheetName, refeicao] of SHEETS) {
    const rows = (data[sheetName]?.items ?? []).filter((r) => r.nome?.trim())
    const filhos = new Map<string, { sabor: string; total: number }[]>()
    for (const row of rows) {
      const nome = row.nome.trim()
      if (!nome.includes('::')) continue
      const [pai, sabor] = nome.split('::').map((s) => s.trim())
      filhos.set(pai, [...(filhos.get(pai) ?? []), { sabor, total: parseNumber(row.qtdEntrou) ?? 0 }])
    }

    let ordem = 0
    for (const row of rows) {
      const nome = row.nome.trim()
      if (nome.includes('::')) continue

      const { qtd, unidade } = parseQtdNecessaria(row.qtdNecessaria ?? '')
      const doFilho = filhos.get(nome) ?? []
      const daColuna = splitSabores(row.sabores)
      const sabores = daColuna.length > 0 ? daColuna : doFilho.map((f) => f.sabor)

      const planilha =
        parseNumber(row.qtdEntrou) ??
        roundQty(doFilho.reduce((sum, f) => sum + f.total, 0))

      const contribuicoes: ImportContribuicao[] = []
      const linhas = (row.contribuicoes ?? '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      for (const linha of linhas) {
        const parsed = parseLogLine(linha, opts.igrejas)
        if (!parsed) {
          report.linhasIgnoradas.push(`${nome}: ${linha}`)
          continue
        }
        contribuicoes.push({ ...parsed, origem: 'importado' })
      }

      const importado = roundQty(contribuicoes.reduce((sum, c) => sum + c.quantidade, 0))
      const diferenca = roundQty(planilha - importado)
      if (diferenca > 0) {
        contribuicoes.push({
          pessoa: 'Ajuste importado',
          igreja: null,
          quantidade: diferenca,
          origem: 'ajuste',
        })
      } else if (diferenca < 0) {
        report.divergencias.push({ item: nome, planilha, importado })
      }

      report.totais.push({ refeicao, item: nome, planilha })
      itens.push({
        refeicao,
        nome,
        qtd_necessaria: qtd,
        unidade,
        sabores,
        ordem: ordem++,
        contribuicoes,
      })
    }
  }

  return {
    payload: {
      regiao: opts.regiao,
      igrejas: opts.igrejas,
      ensaio: { nome: opts.nome, slug: opts.slug, data: opts.data },
      itens,
    },
    report,
  }
}
