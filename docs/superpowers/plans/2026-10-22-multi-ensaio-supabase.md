# Multi-ensaio com Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o Google Sheets pelo Supabase e transformar o app em um controlador de vários ensaios regionais (região → igrejas → ensaios com café/almoço e listas próprias), com links públicos por slug e uma área admin com login.

**Architecture:** Front estático (Vite + React + shadcn, GitHub Pages) usando `@supabase/supabase-js`. O público não lê tabelas: usa as RPCs `ensaio_publico(slug)` e `contribuir(...)` (`security definer`). O admin logado (Supabase Auth) usa as tabelas diretamente sob RLS `authenticated`. Os totais são sempre a soma das contribuições.

**Tech Stack:** React 19, react-router-dom 7, Vite 8, Tailwind 4, shadcn (radix-nova), `@supabase/supabase-js` 2, Vitest, tsx, Postgres (Supabase).

**Spec:** `docs/superpowers/specs/2026-10-22-multi-ensaio-supabase-design.md`

## Global Constraints

- Supabase URL: `https://mfhimqyewibzcbmmtnuj.supabase.co`; o front lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A `service_role` nunca entra em `src/`, `.env` commitado ou workflow.
- Base do app: `/ensaio_regional/` (BrowserRouter `basename="/ensaio_regional"` + `404.html` fallback já existentes).
- Todo texto de interface em português do Brasil.
- Refeições: `cafe` | `almoco`; rótulos `Café da Manhã` / `Almoço`.
- Unidades: `kg`, `L`, `un`, `pct`, `cx`, `ml`, `''`. Inteiras: `un`, `pct`, `cx`, `ml`, `''`. Decimais (até 3 casas): `kg`, `L`.
- Slug: `regiao-AAAA-MM-DD`, minúsculo, sem acentos, não alfanumérico → `-`; colisão → `-2`, `-3`…
- Status do ensaio: `aberto` | `encerrado`. Encerrado = sem botão de contribuir e `contribuir` recusa.
- Origem da contribuição: `link` | `importado` | `ajuste`. `sabor` null só é permitido em `importado`/`ajuste`; `igreja_id` null só em `ajuste`.
- Rota `/` nunca lista ensaios. `anon` não tem nenhuma policy de tabela.
- A região de um ensaio não é editável depois de criado (evita contribuições com igreja de outra região).
- Sincronização pública: ao focar ou voltar para a aba, a cada 30 s e após contribuir. Sem Realtime.
- Siga o estilo existente: componentes shadcn, `cn()`, toasts `sonner`, alias `@/`, sem ponto-e-vírgula, aspas simples.

## Review Focus

1. **Vírgula decimal** — "1,5" em item `kg` deve virar 1.5; "1,5" em `un` deve ser recusado. → teste em `parseQuantidadeInput` (Task 1).
2. **Soma de decimais** — contribuições 0.1 + 0.2 kg devem exibir "0.3 kg", não "0.30000000000000004 kg". → teste em `itemTotal`/`formatQty` (Task 1).
3. **Slug com acento, maiúscula ou espaço na URL** — `/e/Itapema-2026-10-10` e regiões como "José Amândio" devem resolver. `gerarSlug` remove acentos e `ensaio_publico` compara com `lower(trim(p_slug))`. → testes em `slug.test.ts` (Task 2) e check SQL (Task 3).
4. **Ensaio encerrado com o diálogo aberto** — o usuário confirma depois que o admin encerrou: deve ver o toast "Ensaio encerrado", e a tela recarrega mostrando o aviso. → check SQL (Task 3) + passo manual (Task 6).
5. **Nome só com espaços ou muito longo** — `contribuir` recusa `'   '` e nomes com mais de 80 caracteres. → check SQL (Task 3).

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `vitest.config.ts` | criar | Vitest com alias `@` (reusa `vite.config.ts`) |
| `src/data/ensaio.ts` | criar | Tipos de domínio + regras puras (totais, progresso, unidades, formatação) |
| `src/data/ensaio.test.ts` | criar | Testes das regras |
| `src/lib/slug.ts` (+ `.test.ts`) | criar | `gerarSlug`, `slugUnico` |
| `supabase/migrations/001_schema.sql` | criar | Tabelas, RLS, RPCs, grants |
| `supabase/tests/001_checks.sql` | criar | Verificações de regra/permissão (transação com rollback) |
| `src/lib/supabase.ts` | criar | Cliente Supabase + `isSupabaseConfigured()` |
| `src/lib/ensaio-api.ts` (+ `.test.ts`) | criar | `fetchEnsaio`, `contribuir`, `mapEnsaioPublico` |
| `scripts/lib/sheets-parse.ts` (+ `.test.ts`) | criar | Converte o JSON do Apps Script no payload de `importar_ensaio` |
| `scripts/import-sheets.ts` | criar | CLI da importação |
| `src/hooks/use-ensaio.ts` | criar | Carrega e sincroniza o ensaio por slug; `contribuir` |
| `src/pages/public/*` | criar | `home-page`, `ensaio-layout`, `not-found-page`, `config-error` |
| `src/components/*` públicos | modificar | Passam a usar `ensaio.ts` e props do ensaio |
| `src/data/ingredients.ts`, `src/lib/api.ts`, `src/hooks/use-quantities.ts` | remover | Substituídos |
| `src/hooks/use-session.ts` | criar | Sessão do Supabase Auth |
| `src/lib/admin-api.ts` (+ `.test.ts`) | criar | CRUD admin + `toMensagem` |
| `src/pages/admin/*` | criar | `login-page`, `require-admin`, `admin-layout`, `ensaios-list-page`, `ensaio-new-page`, `ensaio-detail-page`, `tabs/dados-tab`, `tabs/itens-tab`, `tabs/contribuicoes-tab`, `regioes-page` |
| `src/App.tsx`, `src/main.tsx` | modificar | Rotas públicas + admin |
| `.env.example`, `README.md`, `.github/workflows/deploy-pages.yml` | modificar | Novas variáveis e setup |
| `apps-script/` | remover | Depois da importação validada |

---

### Task 1: Vitest + regras de domínio (`src/data/ensaio.ts`)

**Files:**
- Create: `vitest.config.ts`, `src/data/ensaio.ts`, `src/data/ensaio.test.ts`
- Modify: `package.json` (devDeps `vitest`; script `"test": "vitest run"`)

**Interfaces:**
- Produces (em `@/data/ensaio`):
  ```ts
  export type MealKey = 'cafe' | 'almoco'
  export type Unit = 'kg' | 'L' | 'un' | 'pct' | 'cx' | 'ml' | ''
  export type Origem = 'link' | 'importado' | 'ajuste'
  export type StatusEnsaio = 'aberto' | 'encerrado'
  export type Regiao = { id: string; nome: string }
  export type Igreja = { id: string; nome: string }
  export type Ensaio = { id: string; nome: string; slug: string; data: string /* AAAA-MM-DD */; status: StatusEnsaio; regiao: Regiao }
  export type Item = { id: string; refeicao: MealKey; nome: string; qtdNecessaria: number | null; unidade: Unit; sabores: string[]; ordem: number }
  export type Contribuicao = { id: string; itemId: string; igrejaId: string | null; igrejaNome: string | null; pessoa: string; sabor: string | null; quantidade: number; origem: Origem; criadoEm: string }
  export type EnsaioPublico = { ensaio: Ensaio; igrejas: Igreja[]; itens: Item[]; contribuicoes: Contribuicao[] }
  export type ContribuirInput = { itemId: string; igrejaId: string; pessoa: string; sabor: string | null; quantidade: number }

  export const MEAL_LABELS: Record<MealKey, string>          // { cafe: 'Café da Manhã', almoco: 'Almoço' }
  export const UNITS: Unit[]                                 // ['kg','L','un','pct','cx','ml','']
  export function isIntegerUnit(u: Unit): boolean
  export function roundQty(n: number): number                // 3 casas
  export function itemTotal(item: Item, contribs: Contribuicao[]): number
  export function saborTotal(item: Item, sabor: string | null, contribs: Contribuicao[]): number
  export function itemFalta(item: Item, contribs: Contribuicao[]): number | null   // null se qtdNecessaria null
  export function isItemCompleto(item: Item, contribs: Contribuicao[]): boolean    // sem necessária → total > 0
  export function mealProgress(itens: Item[], contribs: Contribuicao[]): { complete: number; total: number; pct: number; missingCount: number }
  export function formatQty(n: number, u: Unit): string      // '3 kg', '18 un', '2' (sem unidade)
  export function formatNecessario(item: Item): string       // '10 kg' ou '—'
  export function parseQuantidadeInput(raw: string, u: Unit): number | null  // aceita vírgula; null se ≤0, não numérico, decimal em unidade inteira, >3 casas
  export function formatContributionPhrase(c: Contribuicao, item: Item): string
  ```
- `formatContributionPhrase` reproduz o texto atual: `Deus preparou ${formatQty(q,u sem espaço→ ex '3pct')} de ${nome}[ (${sabor})] para o ${MEAL_LABELS[refeicao]}.` — use `'3pct'`/`'2kg'` (número colado à unidade), como o log atual.

- [ ] **Step 1: Instalar Vitest e criar `vitest.config.ts`**

Run: `npm i -D vitest@3`
`vitest.config.ts` faz `mergeConfig(viteConfig, defineConfig({ test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] } }))`. Adicione `"test": "vitest run"` em `package.json`.

- [ ] **Step 2: Escrever os testes que falham** em `src/data/ensaio.test.ts`

```ts
const bolo: Item = { id: 'b', refeicao: 'cafe', nome: 'Bolo', qtdNecessaria: 18, unidade: 'un', sabores: ['Chocolate', 'Cenoura'], ordem: 0 }
const acucar: Item = { id: 'a', refeicao: 'cafe', nome: 'Açúcar', qtdNecessaria: 10, unidade: 'kg', sabores: [], ordem: 1 }
const c = (itemId: string, quantidade: number, sabor: string | null = null): Contribuicao =>
  ({ id: crypto.randomUUID(), itemId, igrejaId: 'i', igrejaNome: 'Zimbros', pessoa: 'Felipe', sabor, quantidade, origem: 'link', criadoEm: '2026-10-22T10:00:00Z' })

test('itemTotal soma só o item', () => expect(itemTotal(acucar, [c('a', 2), c('a', 3), c('b', 5)])).toBe(5))
test('soma decimal sem erro de ponto flutuante', () => {
  expect(itemTotal(acucar, [c('a', 0.1), c('a', 0.2)])).toBe(0.3)
  expect(formatQty(itemTotal(acucar, [c('a', 0.1), c('a', 0.2)]), 'kg')).toBe('0.3 kg')
})
test('saborTotal filtra por sabor e null = sabor não informado', () => {
  const cs = [c('b', 2, 'Chocolate'), c('b', 3, 'Cenoura'), c('b', 4, null)]
  expect(saborTotal(bolo, 'Chocolate', cs)).toBe(2)
  expect(saborTotal(bolo, null, cs)).toBe(4)
  expect(itemTotal(bolo, cs)).toBe(9)
})
test('itemFalta e completo', () => {
  expect(itemFalta(acucar, [c('a', 4)])).toBe(6)
  expect(itemFalta(acucar, [c('a', 12)])).toBe(0)
  expect(isItemCompleto({ ...acucar, qtdNecessaria: null }, [c('a', 1)])).toBe(true)
  expect(isItemCompleto({ ...acucar, qtdNecessaria: null }, [])).toBe(false)
})
test('mealProgress', () => expect(mealProgress([bolo, acucar], [c('a', 10)])).toEqual({ complete: 1, total: 2, pct: 50, missingCount: 1 }))
test('parseQuantidadeInput', () => {
  expect(parseQuantidadeInput('1,5', 'kg')).toBe(1.5)
  expect(parseQuantidadeInput('1,5', 'un')).toBeNull()
  expect(parseQuantidadeInput('3', 'pct')).toBe(3)
  expect(parseQuantidadeInput('0', 'kg')).toBeNull()
  expect(parseQuantidadeInput('-2', 'kg')).toBeNull()
  expect(parseQuantidadeInput('abc', 'kg')).toBeNull()
  expect(parseQuantidadeInput('1.2345', 'kg')).toBeNull()
})
test('formatQty e formatNecessario', () => {
  expect(formatQty(3, 'pct')).toBe('3 pct')
  expect(formatQty(2, '')).toBe('2')
  expect(formatNecessario({ ...acucar, qtdNecessaria: null })).toBe('—')
})
test('formatContributionPhrase', () =>
  expect(formatContributionPhrase(c('b', 3, 'Chocolate'), bolo)).toBe('Deus preparou 3un de Bolo (Chocolate) para o Café da Manhã.'))
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/data/ensaio'` (ou exports indefinidos).

- [ ] **Step 4: Implementar `src/data/ensaio.ts`** com as assinaturas acima. `roundQty = Math.round(n * 1000) / 1000`, aplicado em todo total e diferença.

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test` → PASS. Run: `npm run build` → sucesso (o módulo novo ainda não é usado; nada quebra).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/data/ensaio.ts src/data/ensaio.test.ts
git commit -m "feat: regras de domínio do ensaio com testes"
```

---

### Task 2: Slug (`src/lib/slug.ts`)

**Files:**
- Create: `src/lib/slug.ts`, `src/lib/slug.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function gerarSlug(regiao: string, data: string /* AAAA-MM-DD */): string
  export function normalizarSlug(raw: string): string   // usado no campo editável do admin
  export function slugUnico(base: string, existentes: string[]): string
  ```

- [ ] **Step 1: Testes que falham**

```ts
test('gerarSlug', () => {
  expect(gerarSlug('Itapema', '2026-10-10')).toBe('itapema-2026-10-10')
  expect(gerarSlug('José Amândio', '2026-11-01')).toBe('jose-amandio-2026-11-01')
  expect(gerarSlug('  Balneário  Camboriú ', '2026-01-05')).toBe('balneario-camboriu-2026-01-05')
})
test('normalizarSlug', () => expect(normalizarSlug('Itapema 2026/10/10!')).toBe('itapema-2026-10-10'))
test('slugUnico', () => {
  expect(slugUnico('itapema-2026-10-10', [])).toBe('itapema-2026-10-10')
  expect(slugUnico('itapema-2026-10-10', ['itapema-2026-10-10'])).toBe('itapema-2026-10-10-2')
  expect(slugUnico('itapema-2026-10-10', ['itapema-2026-10-10', 'itapema-2026-10-10-2'])).toBe('itapema-2026-10-10-3')
})
```

- [ ] **Step 2: `npm test` → FAIL** (módulo inexistente).
- [ ] **Step 3: Implementar.** `normalizarSlug`: `normalize('NFD')`, remover `\p{Diacritic}`, minúsculas, `[^a-z0-9]+` → `-`, aparar `-` nas pontas. `gerarSlug = normalizarSlug(`${regiao}-${data}`)`.
- [ ] **Step 4: `npm test` → PASS.**
- [ ] **Step 5: Commit** — `git add src/lib/slug.ts src/lib/slug.test.ts && git commit -m "feat: geração de slug do ensaio"`

---

### Task 3: Schema do banco, RLS e RPCs

**Files:**
- Create: `supabase/migrations/001_schema.sql`, `supabase/tests/001_checks.sql`

**Interfaces:**
- Produces (Postgres, schema `public`):
  - Tabelas exatamente como na seção "Modelo de dados" da spec, mais: `create extension if not exists unaccent` não é necessário (o slug vem pronto do front/script). Índices: `itens(ensaio_id, refeicao, ordem)`, `contribuicoes(item_id)`, `contribuicoes(criado_em desc)`, `igrejas(regiao_id)`.
  - Checks extras em `contribuicoes`: `check (igreja_id is not null or origem = 'ajuste')`, `check (char_length(pessoa) between 1 and 80)`.
  - `ensaio_publico(p_slug text) returns jsonb` — busca por `slug = lower(trim(p_slug))`; retorna `null` se não achar; senão:
    ```json
    { "ensaio": {"id","nome","slug","data","status","regiao":{"id","nome"}},
      "igrejas": [{"id","nome"}],                       // da região, order by nome
      "itens": [{"id","refeicao","nome","qtd_necessaria","unidade","sabores","ordem"}],   // order by refeicao, ordem, nome
      "contribuicoes": [{"id","item_id","igreja_id","igreja_nome","pessoa","sabor","quantidade","origem","criado_em"}] }  // order by criado_em desc
    ```
    Arrays vazios como `[]`, nunca `null`.
  - `contribuir(p_slug text, p_item_id uuid, p_igreja_id uuid, p_pessoa text, p_sabor text, p_quantidade numeric) returns jsonb` — valida nesta ordem e levanta `raise exception '<mensagem>'` com exatamente:
    1. ensaio não existe → `Ensaio não encontrado`
    2. status ≠ aberto → `Ensaio encerrado`
    3. item não é do ensaio → `Item não pertence a este ensaio`
    4. igreja não é da região do ensaio → `Igreja não pertence à região do ensaio`
    5. `trim(p_pessoa)` vazio ou > 80 → `Informe o seu nome (até 80 caracteres)`
    6. quantidade null/≤0, decimal em unidade inteira (`p_quantidade <> trunc(p_quantidade)`) ou > 3 casas (`<> round(p_quantidade, 3)`) → `Quantidade inválida`
    7. item com sabores e `p_sabor` null/vazio → `Selecione o sabor`; `p_sabor` fora da lista, ou informado em item sem sabores → `Sabor inválido`

    Insere com `pessoa = trim(p_pessoa)`, `origem = 'link'` e retorna `ensaio_publico(p_slug)`.
  - `importar_ensaio(p jsonb) returns uuid` — payload:
    ```json
    { "regiao": "Bombinhas", "igrejas": ["Bombas","José Amândio","Zimbros"],
      "ensaio": {"nome","slug","data"},
      "itens": [{"refeicao","nome","qtd_necessaria","unidade","sabores":[],"ordem",
                 "contribuicoes":[{"pessoa","igreja":"Zimbros"|null,"quantidade","origem":"importado"|"ajuste"}]}] }
    ```
    Reaproveita região/igrejas pelo nome; `raise exception 'Slug já existe: %'` se o slug existir; retorna o id do ensaio. Tudo numa transação (a função inteira).
  - Todas as funções: `language plpgsql security definer set search_path = public`. Grants: `revoke all on function ... from public`; `grant execute` de `ensaio_publico` e `contribuir` para `anon, authenticated`; `importar_ensaio` só para `service_role`.
  - RLS: `enable row level security` nas 5 tabelas; para cada uma, uma policy `admin_all ... for all to authenticated using (true) with check (true)`. Nenhuma policy para `anon`.

- [ ] **Step 1: Escrever `supabase/tests/001_checks.sql`** (o teste que falha). Estrutura: `begin;` → seed (região A com igreja A1; região B com igreja B1; ensaio aberto `teste-2099-01-01` na região A com itens `Açúcar` kg 10, `Pão` un 500, `Bolo` un 18 sabores {Chocolate}; ensaio encerrado `teste-2099-01-02`) → blocos `do $$ ... $$` que usam um helper `expect_error(sql text, msg text)` (criado como função temporária `pg_temp.expect_error`) para cada regra → `rollback;`. Checks:
  - `select ensaio_publico('nao-existe') is null`
  - `ensaio_publico('  TESTE-2099-01-01 ')` retorna o ensaio (Review Focus 3)
  - igrejas do retorno = só A1
  - `contribuir` em `teste-2099-01-02` → `Ensaio encerrado` (Review Focus 4)
  - igreja B1 → `Igreja não pertence à região do ensaio`
  - item de outro ensaio → `Item não pertence a este ensaio`
  - pessoa `'   '` e `repeat('x', 81)` → `Informe o seu nome (até 80 caracteres)` (Review Focus 5)
  - quantidade `0`, `-1`, `1.5` em Pão (un), `1.2345` em Açúcar → `Quantidade inválida`
  - Bolo sem sabor → `Selecione o sabor`; Bolo `Morango` → `Sabor inválido`; Açúcar com sabor `X` → `Sabor inválido`
  - contribuição válida de `1.5` kg em Açúcar retorna payload com 1 contribuição de `pessoa` aparada
  - `set local role anon; select count(*) from ensaios` = 0, e `insert into contribuicoes` falha (RLS); `reset role`
  - como `anon`, `select importar_ensaio('{}')` falha com permissão negada
  - cada check que passa faz `raise notice 'OK: <nome>'`; o que falha faz `raise exception 'FALHOU: <nome>'`.

- [ ] **Step 2: Rodar os checks contra o banco vazio e ver falhar.** No Supabase → SQL Editor, cole `001_checks.sql` e execute. Expected: erro (ex.: `relation "regioes" does not exist`). *Este passo e o 4 são feitos pelo usuário no painel; peça a ele que cole e informe o resultado. Alternativa: `npx supabase db push` se ele fornecer a senha do banco localmente.*

- [ ] **Step 3: Escrever `supabase/migrations/001_schema.sql`** conforme as Interfaces.

- [ ] **Step 4: Aplicar a migration e rodar os checks.** Cole `001_schema.sql` no SQL Editor → sucesso. Cole `001_checks.sql` → todas as linhas `OK:` e nenhuma `FALHOU:`; ao final, o rollback deixa o banco sem dados de teste.

- [ ] **Step 5: Configurar o Auth (usuário, no painel).** Authentication → Sign In / Providers → desativar "Allow new users to sign up"; Authentication → Users → "Add user" com e-mail e senha do admin. Copiar a chave `anon` (Project Settings → API) para o `.env` local como `VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 6: Commit** — `git add supabase && git commit -m "feat: schema Supabase com RLS e RPCs públicas"`

---

### Task 4: Cliente Supabase e API pública

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/ensaio-api.ts`, `src/lib/ensaio-api.test.ts`
- Modify: `package.json` (dep `@supabase/supabase-js@2`), `.env.example`, `.env` (local, não commitado — confirmar que `.env` está no `.gitignore`)

**Interfaces:**
- Consumes: tipos de `@/data/ensaio` (Task 1); RPCs (Task 3).
- Produces:
  ```ts
  // src/lib/supabase.ts
  export const supabase: SupabaseClient | null          // null se faltar env
  export function isSupabaseConfigured(): boolean
  export function requireSupabase(): SupabaseClient    // lança Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.')
  // src/lib/ensaio-api.ts
  export function mapEnsaioPublico(json: unknown): EnsaioPublico | null
  export async function fetchEnsaio(slug: string): Promise<EnsaioPublico | null>
  export async function contribuir(slug: string, input: ContribuirInput): Promise<EnsaioPublico>
  ```
  `fetchEnsaio`/`contribuir` usam `supabase.rpc(...)`; erro da RPC vira `new Error(error.message)` (a mensagem em português do banco).

- [ ] **Step 1: Instalar** — `npm i @supabase/supabase-js@2`. `.env.example` passa a ter só `VITE_SUPABASE_URL=https://mfhimqyewibzcbmmtnuj.supabase.co` e `VITE_SUPABASE_ANON_KEY=`.
- [ ] **Step 2: Testes que falham** para `mapEnsaioPublico`:
  - `null` → `null`
  - payload snake_case de exemplo (1 item kg com `qtd_necessaria: 10`, 1 contribuição com `igreja_nome`, `quantidade: 2.5`) → objeto camelCase com `qtdNecessaria: 10`, `igrejaNome: 'Zimbros'`, `quantidade: 2.5`, `criadoEm` preservado
  - `qtd_necessaria: null` → `qtdNecessaria: null`; `sabores: null` → `[]`
- [ ] **Step 3: `npm test` → FAIL.**
- [ ] **Step 4: Implementar** `supabase.ts` e `ensaio-api.ts`.
- [ ] **Step 5: `npm test` → PASS.** (A chamada real às RPCs é verificada no navegador na Task 6.)
- [ ] **Step 6: Commit** — `git add package.json package-lock.json .env.example src/lib/supabase.ts src/lib/ensaio-api.ts src/lib/ensaio-api.test.ts && git commit -m "feat: cliente Supabase e API pública do ensaio"`

---

### Task 5: Importação da planilha

**Files:**
- Create: `scripts/lib/sheets-parse.ts`, `scripts/lib/sheets-parse.test.ts`, `scripts/import-sheets.ts`
- Modify: `package.json` (devDep `tsx`; script `"import:sheets": "tsx scripts/import-sheets.ts"`)

**Interfaces:**
- Consumes: `importar_ensaio(p jsonb)` (Task 3). Formato de entrada = resposta atual do Apps Script `?action=get`: `{ Cafe: { items: SheetRow[] }, Almoco: { items: SheetRow[] } }`, com `SheetRow = { nome, qtdNecessaria, qtdEntrou, contribuicoes?, sabores? }`.
- Produces:
  ```ts
  export function parseQtdNecessaria(raw: string): { qtd: number | null; unidade: Unit }   // '10 kg'→{10,'kg'}, '4 pc'→{4,'pct'}, '36 L'/'36 l'→{36,'L'}, ''→{null,''}
  export function parseLogLine(line: string, igrejas: string[]): { pessoa: string; igreja: string; quantidade: number } | null  // 'Felipe - Zimbros - 3pct'
  export type ImportReport = { linhasIgnoradas: string[]; divergencias: { item: string; planilha: number; importado: number }[]; comparativo: { refeicao: MealKey; item: string; planilha: number; supabase: number }[] }
  export function buildImportPayload(sheet: unknown, opts: { regiao: string; igrejas: string[]; nome: string; slug: string; data: string }): { payload: ImportarEnsaioPayload; report: ImportReport }
  ```
  `ImportarEnsaioPayload` = o JSON de `importar_ensaio` (Task 3). Regras da spec: linhas `Pai::Sabor` não viram itens; sabores da coluna E ou dos filhos `Pai::`; total da planilha do item = coluna C do pai (se vazia, soma dos filhos); contribuições `importado` com `sabor` omitido; diferença positiva → uma contribuição `ajuste` com `pessoa: 'Ajuste importado'`, `igreja: null`; diferença negativa → entra em `divergencias`.

- [ ] **Step 1: Testes que falham** (`sheets-parse.test.ts`):
  - `parseQtdNecessaria` nos 4 casos acima e `'1 cx'`.
  - `parseLogLine('Felipe - Zimbros - 3pct', igrejas)` → `{ pessoa: 'Felipe', igreja: 'Zimbros', quantidade: 3 }`; `'Ana - José Amândio - 1.5kg'` → 1.5; `'Ana - Itajaí - 2un'` → `null`; `'texto solto'` → `null`.
  - `buildImportPayload` com: Café `[Açúcar '10 kg' C='5 kg' D='Felipe - Zimbros - 3kg']`, `[Bolo '18 un' C='' E='Chocolate, Cenoura']`, `[Bolo::Chocolate C='4']`, `[Bolo::Cenoura C='2']`; Almoço `[]` →
    - 2 itens (Açúcar, Bolo), Bolo com `sabores ['Chocolate','Cenoura']`, ordem 0 e 1
    - Açúcar: contribuições `[importado 3 Zimbros, ajuste 2 null]`
    - Bolo: uma contribuição `ajuste` 6
    - `divergencias` vazio
  - Item com C='2 kg' e log somando 5 kg → `divergencias` = `[{ item: 'Açúcar', planilha: 2, importado: 5 }]`.
- [ ] **Step 2: `npm test` → FAIL.**
- [ ] **Step 3: Implementar `sheets-parse.ts`**, depois `import-sheets.ts`: argumentos `--data AAAA-MM-DD` (obrigatório), `--nome` (padrão `Ensaio Regional Bombinhas`), `--dry-run`; env `APPS_SCRIPT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Fluxo: fetch da planilha → `buildImportPayload` (slug = `gerarSlug('Bombinhas', data)`) → se houver `divergencias`, imprime e sai com código 1 → se `--dry-run`, imprime o resumo e sai → `rpc('importar_ensaio')` com o cliente `service_role` → `rpc('ensaio_publico', { p_slug })` → imprime `console.table(comparativo)` com `supabase` calculado via `itemTotal` → sai com código 1 se algum total diferir.
- [ ] **Step 4: `npm test` → PASS.**
- [ ] **Step 5: Dry-run com a planilha real** (o usuário exporta as env no próprio terminal; nunca colar a `service_role` no chat):
  ```bash
  npm run import:sheets -- --data 2026-11-15 --dry-run
  ```
  Expected: lista de itens e contagem de contribuições, sem divergências. Se houver linhas ignoradas, mostre-as ao usuário antes de seguir.
- [ ] **Step 6: Importação real** (mesmo comando sem `--dry-run`, com a data real do ensaio confirmada pelo usuário). Expected: tabela comparativa com todos os totais iguais e saída 0.
- [ ] **Step 7: Commit** — `git add scripts package.json package-lock.json && git commit -m "feat: importação única da planilha para o Supabase"`

---

### Task 6: Telas públicas por slug

**Files:**
- Create: `src/hooks/use-ensaio.ts`, `src/pages/public/home-page.tsx`, `src/pages/public/ensaio-layout.tsx`, `src/pages/public/not-found-page.tsx`, `src/pages/public/config-error.tsx`
- Modify: `src/App.tsx`, `src/components/app-sidebar.tsx`, `src/components/mobile-bottom-nav.tsx`, `src/components/dashboard-page.tsx`, `src/components/meal-page.tsx`, `src/components/ingredients-table.tsx`, `src/components/contribute-dialog.tsx`
- Delete: `src/data/ingredients.ts`, `src/lib/api.ts`, `src/hooks/use-quantities.ts`

**Interfaces:**
- Consumes: `fetchEnsaio`, `contribuir` (Task 4); regras de `@/data/ensaio` (Task 1).
- Produces:
  ```ts
  export function useEnsaio(slug: string): {
    data: EnsaioPublico | null; notFound: boolean; loading: boolean; syncing: boolean; saving: boolean
    lastSyncedAt: Date | null; error: string | null
    refresh: (silent?: boolean) => Promise<void>
    contribuir: (input: ContribuirInput) => Promise<void>   // em erro: toast + refresh(true) + rethrow
  }
  ```
  Mantém o padrão do `use-quantities.ts` atual: `requestId` contra respostas fora de ordem, sync em `visibilitychange`/`focus`/`pageshow`, intervalo de 30 s. Sem atualização otimista (a RPC já devolve o ensaio atualizado).
- Props novas:
  - `AppSidebar({ ensaio }: { ensaio: Ensaio })` e `MobileBottomNav({ slug }: { slug: string })`: links `/e/${slug}`, `/e/${slug}/cafe`, `/e/${slug}/almoco`; o cabeçalho da sidebar mostra `ensaio.nome` e a data em `dd/MM/aaaa`.
  - `DashboardPage({ data }: { data: EnsaioPublico })`: o card "Ver lista" aponta para `/e/${slug}/${meal}`; "Últimas contribuições" = `data.contribuicoes.slice(0, 20)` (já vem em ordem desc).
  - `MealPage({ meal, data, encerrado, loading, syncing, saving, lastSyncedAt, error, onRefresh, onContribute })`, com `onContribute: (input: ContribuirInput) => Promise<void>`. A mensagem de lista vazia passa a ser "Nenhum item cadastrado nesta refeição."
  - `IngredientsTable({ itens, contribuicoes, igrejas, disabled, encerrado, onContribute })`: com `encerrado`, o botão "Contribuir" não é renderizado. Para itens com sabores, mostrar abaixo de "Já entrou" o detalhamento `Chocolate 4 · Cenoura 2 · Não informado 6`, omitindo sabores zerados.
  - `ContributeDialog({ open, onOpenChange, item, contribuicoes, igrejas, disabled, onContribute })`: a lista de igrejas vem de `igrejas`; quantidade via `parseQuantidadeInput`; envia `{ itemId, igrejaId, pessoa: pessoa.trim(), sabor, quantidade }`. Sem cálculo de `updates`.
- Rotas em `App.tsx`:
  ```
  /                     → HomePage ("Acesse pelo link do seu ensaio.")
  /e/:slug              → EnsaioLayout (index → DashboardPage, 'cafe' → MealPage, 'almoco' → MealPage)
  /admin/*              → reservado (Task 7)
  *                     → NotFoundPage
  ```
  `EnsaioLayout` chama `useEnsaio(slug)`, renderiza `SidebarProvider` + `AppSidebar` + header (nome do ensaio) + `<Outlet context>` + `MobileBottomNav`. Com `notFound`, renderiza `NotFoundPage` ("Ensaio não encontrado"). Com `status === 'encerrado'`, mostra uma faixa no topo: "Ensaio encerrado — contribuições não são mais aceitas." Sem env configurada, `App` renderiza `ConfigError`.

- [ ] **Step 1: Criar `use-ensaio.ts`** e as páginas em `src/pages/public/`.
- [ ] **Step 2: Migrar os componentes** para `@/data/ensaio` e as novas props; apagar `ingredients.ts`, `api.ts` e `use-quantities.ts`.
- [ ] **Step 3: Verificar o build** — `npm run build` → sucesso, sem imports de `@/data/ingredients` ou `@/lib/api` (`grep -r "data/ingredients\|lib/api'" src` vazio). `npm test` → PASS.
- [ ] **Step 4: Verificar no navegador** (dev server `ensaio-regional` do `.claude/launch.json`, com o ensaio importado na Task 5):
  - `/ensaio_regional/` mostra só "Acesse pelo link do seu ensaio."
  - `/ensaio_regional/e/<slug>` mostra o resumo com os totais iguais aos da planilha.
  - `/e/<slug>/cafe` → contribuir com "1,5" em um item kg → toast de sucesso, total +1.5; aparece no topo de "Últimas contribuições".
  - `/e/<SLUG-EM-MAIÚSCULAS>/cafe` abre o mesmo ensaio.
  - `/e/nao-existe` → "Ensaio não encontrado".
  - Encerrar o ensaio pelo SQL Editor (`update ensaios set status='encerrado' ...`) com o diálogo aberto → Confirmar → toast "Ensaio encerrado", e a página mostra a faixa e esconde os botões. Reabrir em seguida.
  - Console sem erros; layout ok em 375 px de largura.
- [ ] **Step 5: Commit** — `git add -A src && git commit -m "feat: telas públicas por slug usando Supabase"`

---

### Task 7: Login e casca do admin

**Files:**
- Create: `src/hooks/use-session.ts`, `src/pages/admin/login-page.tsx`, `src/pages/admin/require-admin.tsx`, `src/pages/admin/admin-layout.tsx`
- Modify: `src/App.tsx`
- Add shadcn: `npx shadcn@latest add tabs select alert-dialog textarea card`

**Interfaces:**
- Consumes: `requireSupabase()` (Task 4).
- Produces:
  ```ts
  export function useSession(): { session: Session | null; loading: boolean; signIn(email: string, senha: string): Promise<void>; signOut(): Promise<void> }
  export function RequireAdmin(): JSX.Element   // loading → spinner; sem sessão → <Navigate to="/admin/login" state={{ from }} replace/>; senão <Outlet/>
  export function AdminLayout(): JSX.Element    // header "Admin · Ensaio Regional", links Ensaios (/admin) e Regiões (/admin/regioes), botão Sair; <Outlet/>
  ```
  `useSession` usa `getSession()` + `onAuthStateChange`. `signIn` usa `signInWithPassword`; erro → toast "E-mail ou senha inválidos". Após login, volta para `state.from` ou `/admin`.
- Rotas: `/admin/login` → `LoginPage`; `/admin` → `RequireAdmin` → `AdminLayout` → filhas (index, `ensaios/novo`, `ensaios/:id`, `regioes`), com placeholders "Em construção" até as Tasks 8–10.

- [ ] **Step 1: Adicionar os componentes shadcn e criar os arquivos.**
- [ ] **Step 2: `npm run build` → sucesso.**
- [ ] **Step 3: Navegador:** `/admin` sem sessão → redireciona para `/admin/login`; senha errada → toast; login com o admin da Task 3 → `/admin`; recarregar mantém a sessão; Sair → volta ao login. `/admin/regioes` sem sessão → login → volta para `/admin/regioes`.
- [ ] **Step 4: Commit** — `git add -A src components.json package.json package-lock.json && git commit -m "feat: login e layout do admin"`

---

### Task 8: Admin — regiões e igrejas

**Files:**
- Create: `src/lib/admin-api.ts`, `src/lib/admin-api.test.ts`, `src/pages/admin/regioes-page.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `requireSupabase()` (Task 4), tipos de `@/data/ensaio` (Task 1).
- Produces (em `@/lib/admin-api`; todas lançam `Error(toMensagem(err))`):
  ```ts
  export type RegiaoComIgrejas = Regiao & { igrejas: Igreja[] }
  export function toMensagem(err: { code?: string; message: string; details?: string }): string
  export async function listRegioes(): Promise<RegiaoComIgrejas[]>   // regiões e igrejas por nome
  export async function criarRegiao(nome: string): Promise<void>
  export async function renomearRegiao(id: string, nome: string): Promise<void>
  export async function excluirRegiao(id: string): Promise<void>       // FK restrict → toMensagem 23503
  export async function criarIgreja(regiaoId: string, nome: string): Promise<void>
  export async function renomearIgreja(id: string, nome: string): Promise<void>
  export async function excluirIgreja(id: string): Promise<void>
  ```
  `toMensagem`: `23505` com `slug` na mensagem/detalhe → `Já existe um ensaio com esse link`; `23505` com `itens` → `Já existe um item com esse nome nesta refeição`; `23505` com `regioes`/`igrejas` → `Já existe um cadastro com esse nome`; `23503` → `Não é possível excluir: está em uso por ensaios ou contribuições`; `23514` → `Valor inválido`; outros → `err.message`.
  Nomes aparados; vazio → toast "Informe o nome" sem chamar a API.
- Tela: um card por região (ordem alfabética) com renomear/excluir, a lista de igrejas (renomear/excluir inline) e o campo "Adicionar igreja"; no topo, o campo "Nova região".
- Igreja sem contribuições é excluída direto; com contribuições → toast "Não é possível excluir: está em uso por ensaios ou contribuições". Região sem igrejas e sem ensaios pode ser excluída (o `restrict` cuida do resto).

- [ ] **Step 1: Testes que falham** para `toMensagem` (um caso por regra acima, incluindo o fallback).
- [ ] **Step 2: `npm test` → FAIL.**
- [ ] **Step 3: Implementar** as funções e a página.
- [ ] **Step 4: `npm test` → PASS; `npm run build` → sucesso.**
- [ ] **Step 5: Navegador:** criar a região "Itapema" com 5 igrejas; renomear uma; tentar excluir "Bombinhas" → toast de "em uso"; tentar excluir a igreja "Zimbros" (tem contribuições importadas) → toast de "em uso"; criar e excluir uma região vazia → some.
- [ ] **Step 6: Commit** — `git add src && git commit -m "feat: admin de regiões e igrejas"`

---

### Task 9: Admin — lista e criação de ensaios

**Files:**
- Create: `src/pages/admin/ensaios-list-page.tsx`, `src/pages/admin/ensaio-new-page.tsx`
- Modify: `src/lib/admin-api.ts`, `src/App.tsx` (troca os placeholders)

**Interfaces:**
- Consumes: `toMensagem`, `listRegioes` (Task 8), `gerarSlug`/`normalizarSlug`/`slugUnico` (Task 2).
- Produces (acréscimos em `@/lib/admin-api`):
  ```ts
  export type EnsaioResumo = Ensaio & { totalItens: number }
  export async function listEnsaios(): Promise<EnsaioResumo[]>          // order by data desc
  export async function listSlugs(): Promise<string[]>
  export async function criarEnsaio(input: { regiaoId: string; nome: string; slug: string; data: string }): Promise<string>
  export async function copiarItens(origemId: string, destinoId: string): Promise<number>  // copia refeicao,nome,qtd_necessaria,unidade,sabores,ordem
  export async function excluirEnsaio(id: string): Promise<void>
  ```
- Tela de novo ensaio: campos Região (select), Data (date), Nome (padrão `Ensaio Regional ${regiao}`, editável), Link (`normalizarSlug`, sugerido por `slugUnico(gerarSlug(regiao, data), slugs)` enquanto o usuário não editar; prévia `…/ensaio_regional/e/<slug>`), "Copiar lista de" (select: "Nenhum (começar vazio)" + ensaios por data desc). Ao salvar: `criarEnsaio` → se escolheu origem, `copiarItens`; se a cópia falhar, `excluirEnsaio(novoId)` e toast de erro → em caso de sucesso, navega para `/admin/ensaios/:id`.
- Lista: cards/tabela com nome, região, data `dd/MM/aaaa`, badge Aberto/Encerrado, nº de itens; clique abre o detalhe; botão "Novo ensaio".

- [ ] **Step 1: Implementar** as funções e as duas páginas.
- [ ] **Step 2: `npm test` → PASS; `npm run build` → sucesso.**
- [ ] **Step 3: Navegador:** criar o ensaio "Itapema" (região criada na Task 8) com data 2026-10-10 copiando do ensaio de Bombinhas → slug sugerido `itapema-2026-10-10` → detalhe aberto; o link público de Café de Itapema lista as 5 igrejas de Itapema no formulário. Criar outro na mesma região e data → slug sugerido `itapema-2026-10-10-2`. Editar o slug manualmente para um já existente → toast "Já existe um ensaio com esse link".
- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: admin lista e cria ensaios copiando lista"`

---

### Task 10: Admin — detalhe do ensaio (Dados, Itens, Contribuições, links)

**Files:**
- Create: `src/pages/admin/ensaio-detail-page.tsx`, `src/pages/admin/tabs/dados-tab.tsx`, `src/pages/admin/tabs/itens-tab.tsx`, `src/pages/admin/tabs/contribuicoes-tab.tsx`, `src/lib/links.ts`, `src/lib/links.test.ts`
- Modify: `src/lib/admin-api.ts`, `src/App.tsx`

**Interfaces:**
- Consumes: Task 8 (`toMensagem`, `listRegioes`), Task 9 (`excluirEnsaio`), Task 1 (tipos, `parseQuantidadeInput`, `isIntegerUnit`, `UNITS`, `MEAL_LABELS`), Task 2 (`normalizarSlug`).
- Produces:
  ```ts
  // src/lib/links.ts
  export function ensaioUrl(slug: string, alvo: 'resumo' | MealKey, origin = window.location.origin): string
  // → `${origin}/ensaio_regional/e/${slug}` | `${origin}/ensaio_regional/e/${slug}/cafe` | `.../almoco`
  // src/lib/admin-api.ts (acréscimos)
  export type ItemInput = { refeicao: MealKey; nome: string; qtdNecessaria: number | null; unidade: Unit; sabores: string[] }
  export async function getEnsaio(id: string): Promise<Ensaio>
  export async function atualizarEnsaio(id: string, patch: Partial<{ nome: string; slug: string; data: string; status: StatusEnsaio }>): Promise<void>
  export async function listItens(ensaioId: string): Promise<Item[]>
  export async function criarItem(ensaioId: string, input: ItemInput): Promise<Item>     // ordem = max(ordem da refeição) + 1
  export async function atualizarItem(id: string, input: ItemInput): Promise<void>
  export async function excluirItem(id: string): Promise<void>
  export async function reordenarItens(idsEmOrdem: string[]): Promise<void>              // ordem = índice
  export async function listContribuicoes(ensaioId: string): Promise<Contribuicao[]>     // join igrejas(nome), itens!inner(ensaio_id), order criado_em desc
  export async function atualizarContribuicao(id: string, patch: { pessoa: string; igrejaId: string | null; sabor: string | null; quantidade: number }): Promise<void>
  export async function excluirContribuicao(id: string): Promise<void>
  ```
- Topo do detalhe: nome, região, data, badge de status e três botões "Copiar link" (Resumo / Café / Almoço) que usam `navigator.clipboard.writeText(ensaioUrl(...))` + toast "Link copiado".
- **Dados**: editar nome, data e slug (`normalizarSlug`). A região aparece só como texto (não editável). Botão "Encerrar ensaio" / "Reabrir ensaio". "Excluir ensaio" com `AlertDialog` ("Isso apaga os itens e todas as contribuições deste ensaio.") → `excluirEnsaio` → `/admin`.
- **Itens**: duas seções (Café, Almoço). Cada linha: nome, necessário (`formatNecessario`), sabores, botões ↑ ↓ (trocam com o vizinho e chamam `reordenarItens` da refeição), editar e excluir (confirmação avisando que as contribuições do item serão apagadas). Formulário de item (dialog): nome, quantidade necessária (opcional; aceita vírgula), unidade (select `UNITS`, rótulo "sem unidade" para `''`), sabores (texto separado por vírgula → array aparado, sem vazios nem duplicados).
- **Contribuições**: filtros por refeição e igreja; linhas com data/hora, pessoa, igreja (ou "—"), item, sabor (ou "não informado"), quantidade + unidade e origem (badge para `importado`/`ajuste`). Editar (dialog: pessoa, igreja — select das igrejas da região, mais "— (ajuste)" quando a origem é `ajuste` —, sabor — select dos sabores do item, mais "não informado" quando a origem ≠ `link` —, quantidade via `parseQuantidadeInput` com a unidade do item) e excluir com confirmação.

- [ ] **Step 1: Teste que falha** `links.test.ts`: `ensaioUrl('itapema-2026-10-10', 'cafe', 'https://felipe-barbero.github.io')` → `'https://felipe-barbero.github.io/ensaio_regional/e/itapema-2026-10-10/cafe'`; `'resumo'` → sem sufixo.
- [ ] **Step 2: `npm test` → FAIL.**
- [ ] **Step 3: Implementar** `links.ts`, as funções de `admin-api.ts` e as três abas.
- [ ] **Step 4: `npm test` → PASS; `npm run build` → sucesso.**
- [ ] **Step 5: Navegador:**
  - Copiar os 3 links de Itapema e abrir cada um → página certa do ensaio certo.
  - Itens: adicionar "Café" 4 pct no café de Itapema, mover para o topo e confirmar a ordem no link público; editar a quantidade; criar um item com nome duplicado → toast "Já existe um item com esse nome nesta refeição".
  - Contribuir pelo link público em Itapema; no admin, editar a quantidade de 30 para 3 → o total no link público cai (após refresh); excluir → o total volta.
  - Bombinhas continua com os seus totais intactos (independência entre ensaios).
  - Encerrar pelo Dados → o link público mostra a faixa e esconde os botões; Reabrir → voltam.
- [ ] **Step 6: Commit** — `git add src && git commit -m "feat: admin detalhe do ensaio com itens, contribuições e links"`

---

### Task 11: Deploy, README e limpeza

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`, `README.md`
- Delete: `apps-script/`

- [ ] **Step 1: Workflow** — no passo Build, trocar `VITE_APPS_SCRIPT_URL: ${{ secrets.VITE_APPS_SCRIPT_URL }}` por `VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}` e `VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}`. Adicionar `- name: Test` com `run: npm test` antes do Build.
- [ ] **Step 2: README** — reescrever as seções 1–3: criar o projeto/rodar `supabase/migrations/001_schema.sql` e `supabase/tests/001_checks.sql`; desativar o cadastro e criar o admin; `.env`; secrets do GitHub (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); "Como usar": criar região → criar ensaio (copiando lista) → copiar links para os grupos → encerrar após o evento. Mencionar `npm run import:sheets` como histórico da migração.
- [ ] **Step 3: Remover `apps-script/`** (só depois de a Task 5 ter validado os totais).
- [ ] **Step 4: Verificação final** — `npm test` → PASS; `npm run build` → sucesso; `npm run lint` → sem erros novos. No navegador, repetir o roteiro do critério de sucesso 1–5 da spec de ponta a ponta em largura 375 px e desktop.
- [ ] **Step 5: Usuário** cria os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no GitHub (Settings → Secrets and variables → Actions) e remove `VITE_APPS_SCRIPT_URL`.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: deploy com Supabase, README e remoção do Apps Script"`
