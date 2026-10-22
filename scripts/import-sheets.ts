// Importação única da planilha (Apps Script) para o Supabase.
//
// Uso (as variáveis ficam só no seu terminal, nunca no repositório):
//   APPS_SCRIPT_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npm run import:sheets -- --data 2026-11-15 [--nome "..."] [--dry-run]
import { parseArgs } from 'node:util'

import { createClient } from '@supabase/supabase-js'

import { itemTotal } from '../src/data/ensaio.ts'
import { mapEnsaioPublico } from '../src/lib/ensaio-map.ts'
import { gerarSlug } from '../src/lib/slug.ts'
import { buildImportPayload } from './lib/sheets-parse.ts'

const REGIAO = 'Bombinhas'
const IGREJAS = ['Bombas', 'José Amândio', 'Zimbros']

function env(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Defina a variável de ambiente ${name}.`)
    process.exit(1)
  }
  return value
}

async function main() {
  const { values } = parseArgs({
    options: {
      data: { type: 'string' },
      nome: { type: 'string', default: `Ensaio Regional ${REGIAO}` },
      'dry-run': { type: 'boolean', default: false },
    },
  })
  if (!values.data || !/^\d{4}-\d{2}-\d{2}$/.test(values.data)) {
    console.error('Informe --data AAAA-MM-DD')
    process.exit(1)
  }
  const dryRun = values['dry-run']

  const url = new URL(env('APPS_SCRIPT_URL'))
  url.searchParams.set('action', 'get')
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Apps Script respondeu ${response.status}`)
  const sheet = await response.json()

  const slug = gerarSlug(REGIAO, values.data)
  const { payload, report } = buildImportPayload(sheet, {
    regiao: REGIAO,
    igrejas: IGREJAS,
    nome: values.nome!,
    slug,
    data: values.data,
  })

  const nContrib = payload.itens.reduce(
    (n, i) => n + i.contribuicoes.filter((c) => c.origem === 'importado').length,
    0,
  )
  const nAjustes = payload.itens.reduce(
    (n, i) => n + i.contribuicoes.filter((c) => c.origem === 'ajuste').length,
    0,
  )
  console.log(`Ensaio: ${payload.ensaio.nome} (${slug})`)
  console.log(`Itens: ${payload.itens.length} · contribuições: ${nContrib} · ajustes: ${nAjustes}`)
  if (report.linhasIgnoradas.length > 0) {
    console.log('\nLinhas ignoradas (entram no ajuste):')
    for (const linha of report.linhasIgnoradas) console.log(`  - ${linha}`)
  }
  if (report.divergencias.length > 0) {
    console.error('\nDivergências (contribuições somam mais que a coluna C):')
    console.table(report.divergencias)
    process.exit(1)
  }
  if (dryRun) {
    console.table(
      payload.itens.map((i) => ({
        refeicao: i.refeicao,
        item: i.nome,
        necessario: i.qtd_necessaria,
        unidade: i.unidade || '(sem)',
        sabores: i.sabores.join(', '),
        planilha: report.totais.find((t) => t.refeicao === i.refeicao && t.item === i.nome)
          ?.planilha,
      })),
    )
    console.log('\n--dry-run: nada foi gravado.')
    return
  }

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  const { error } = await supabase.rpc('importar_ensaio', { p: payload })
  if (error) throw new Error(error.message)

  const { data, error: readError } = await supabase.rpc('ensaio_publico', { p_slug: slug })
  if (readError) throw new Error(readError.message)
  const ensaio = mapEnsaioPublico(data)
  if (!ensaio) throw new Error('Ensaio importado não encontrado')

  const comparativo = report.totais.map((t) => {
    const item = ensaio.itens.find((i) => i.refeicao === t.refeicao && i.nome === t.item)
    const supabaseTotal = item ? itemTotal(item, ensaio.contribuicoes) : -1
    return { ...t, supabase: supabaseTotal, ok: supabaseTotal === t.planilha ? '✓' : '✗' }
  })
  console.table(comparativo)

  if (comparativo.some((c) => c.ok !== '✓')) {
    console.error('Totais divergentes — confira antes de usar este ensaio.')
    process.exit(1)
  }
  console.log(`\nImportado. Link: /ensaio_regional/e/${slug}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
