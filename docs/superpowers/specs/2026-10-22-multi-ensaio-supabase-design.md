# Multi-ensaio com Supabase — Design

Data: 2026-10-22
Status: aguardando revisão

## Objetivo

Transformar o app de controle de ingredientes (hoje um único ensaio, com uma planilha Google Sheets como banco) em um **controlador de ensaios regionais**:

- Uma **região** reúne várias **igrejas** (ex.: Bombinhas → Bombas, José Amândio, Zimbros; Itapema → 5 igrejas).
- O admin cadastra vários **ensaios**, cada um ligado a uma região, com **café e almoço independentes** e **lista de ingredientes própria**.
- Cada ensaio tem **links próprios** para Resumo, Café e Almoço, enviados em grupos de WhatsApp separados.
- O backend sai do Google Sheets/Apps Script e passa a ser o **Supabase** (`https://mfhimqyewibzcbmmtnuj.supabase.co`).

### Critérios de sucesso

1. O admin cria o ensaio de Itapema copiando a lista do de Bombinhas, ajusta as quantidades e copia os links de Café, Almoço e Resumo.
2. Quem abre o link de Café de Itapema vê a lista do café **daquele ensaio**, contribui escolhendo uma das igrejas de Itapema e vê o total atualizar.
3. Ninguém sem login consegue listar os ensaios existentes, nem pela tela nem pela API.
4. Com o ensaio encerrado, os links continuam mostrando listas e resumo, mas não aceitam contribuições.
5. O admin corrige uma contribuição errada e o total se recalcula.
6. Os dados atuais da planilha (listas + contribuições) aparecem como um ensaio de Bombinhas, com os mesmos totais.

### Fora do escopo

- Admins com permissão restrita por região (todo admin vê e edita tudo).
- Cadastro de admin pelo app (contas criadas no painel do Supabase).
- Modelos de lista separados dos ensaios (o reaproveitamento é por "copiar de outro ensaio").
- Realtime / websockets.

## Decisões

| Tema | Decisão |
|---|---|
| Administração | Área admin no app, com login e-mail/senha do Supabase Auth |
| Permissões de admin | Todo admin logado vê e edita tudo |
| Lista de um ensaio novo | Copiar itens de outro ensaio (sem contribuições) ou começar vazio |
| Link público | Abre na refeição indicada, com navegação para a outra refeição e o resumo **do mesmo ensaio** |
| Ciclo de vida | Ensaio tem `data` e `status` aberto/encerrado; encerrado = só leitura; o admin pode reabrir |
| Correção | O admin edita e exclui contribuições; o público só adiciona |
| Dados atuais | Importar tudo: região, igrejas, itens e contribuições |
| Arquitetura | Front estático (GitHub Pages) + `supabase-js`; o público usa só funções RPC; o admin usa as tabelas sob RLS |
| Rota `/` | Não lista ensaios; mostra "Acesse pelo link do seu ensaio" |
| Slug | `regiao-AAAA-MM-DD` (ex.: `itapema-2026-10-10`), sem acentos, editável; colisão → sufixo `-2`, `-3`… |
| Sincronização | Igual à de hoje: ao focar ou voltar para a aba, a cada 30 s e após contribuir |

## Modelo de dados

```sql
regioes (
  id          uuid pk default gen_random_uuid(),
  nome        text not null unique,
  criado_em   timestamptz not null default now()
)

igrejas (
  id          uuid pk,
  regiao_id   uuid not null references regioes on delete restrict,
  nome        text not null,
  unique (regiao_id, nome)
)

ensaios (
  id          uuid pk,
  regiao_id   uuid not null references regioes on delete restrict,
  nome        text not null,                 -- ex.: "Ensaio Regional Itapema"
  slug        text not null unique,          -- ex.: itapema-2026-10-10
  data        date not null,
  status      text not null default 'aberto' check (status in ('aberto','encerrado')),
  criado_em   timestamptz not null default now()
)

itens (
  id              uuid pk,
  ensaio_id       uuid not null references ensaios on delete cascade,
  refeicao        text not null check (refeicao in ('cafe','almoco')),
  nome            text not null,
  qtd_necessaria  numeric check (qtd_necessaria is null or qtd_necessaria > 0),
  unidade         text not null default '' check (unidade in ('kg','L','un','pct','cx','ml','')),
  sabores         text[] not null default '{}',
  ordem           int not null default 0,
  unique (ensaio_id, refeicao, nome)
)

contribuicoes (
  id          uuid pk,
  item_id     uuid not null references itens on delete cascade,
  igreja_id   uuid references igrejas on delete restrict,  -- null só em origem 'ajuste'
  pessoa      text not null,
  sabor       text,
  quantidade  numeric not null check (quantidade > 0),
  origem      text not null default 'link' check (origem in ('link','importado','ajuste')),
  criado_em   timestamptz not null default now()
)
```

Regras:

- **"Já entrou" não é gravado**: é `sum(quantidade)` das contribuições do item (e, por sabor, a soma filtrada por `sabor`). Editar ou excluir uma contribuição recalcula o total automaticamente.
- Unidades inteiras (`un`, `pct`, `cx`, `ml`, vazio) aceitam só quantidades inteiras; `kg` e `L` aceitam até 3 casas decimais. A regra vale no front e é revalidada em `contribuir`.
- Sabores: em contribuições `origem = 'link'`, se `itens.sabores` não estiver vazio, `sabor` é obrigatório e precisa estar na lista; caso contrário, `sabor` precisa ser null. Contribuições `importado`/`ajuste` podem ter `sabor` null mesmo em itens com sabores: contam no total do item e aparecem como "sabor não informado" no detalhamento por sabor.
- Ao excluir um ensaio, seus itens e contribuições são apagados em cascata. Regiões e igrejas em uso não podem ser excluídas (`restrict`).

## Permissões (RLS + RPC)

- **RLS ativo em todas as tabelas.**
- Role `anon`: **nenhuma** policy de leitura ou escrita nas tabelas.
- Role `authenticated` (admin): `select/insert/update/delete` em todas as tabelas.
- Funções `security definer`, com `search_path` fixo, `execute` concedido a `anon` e `authenticated`:
  - `ensaio_publico(p_slug text) returns jsonb`: devolve `{ ensaio: {id, nome, slug, data, status, regiao}, igrejas: [...], itens: [...], contribuicoes: [...] }` só daquele slug, ou `null` se não existir. As contribuições incluem `pessoa`, nome da igreja, item, sabor, quantidade e `criado_em`.
  - `contribuir(p_slug text, p_item_id uuid, p_igreja_id uuid, p_pessoa text, p_sabor text, p_quantidade numeric) returns jsonb`: valida que o ensaio existe e está `aberto`, que o item pertence ao ensaio, que a igreja pertence à região do ensaio, que a pessoa não está vazia (até 80 caracteres), que a quantidade é > 0 e respeita a unidade, e que o sabor é coerente com o item. Grava com `origem = 'link'` e devolve o mesmo payload de `ensaio_publico`. Os erros saem como exceção com mensagem em português, exibida em toast.
- Contas de admin são criadas no painel do Supabase (Authentication → Users). O cadastro público é desativado nas configurações de Auth.

## Rotas e telas

Base: `/ensaio_regional/` (BrowserRouter + `404.html` fallback, como hoje).

### Público

| Rota | Tela |
|---|---|
| `/` | Mensagem "Acesse pelo link do seu ensaio". Não lista nada. |
| `/e/:slug` | Resumo do ensaio (o `dashboard-page` atual: progresso de café e almoço + últimas contribuições) |
| `/e/:slug/cafe` | Lista do café (o `meal-page` atual: busca + contribuir) |
| `/e/:slug/almoco` | Lista do almoço |

- O menu lateral e a barra inferior do celular mostram Resumo / Café / Almoço **do ensaio atual**; o cabeçalho mostra nome e data.
- Ensaio encerrado: aviso "Ensaio encerrado" no topo, sem o botão de contribuir.
- Slug inexistente: tela "Ensaio não encontrado".
- O formulário de contribuição lista as igrejas da região do ensaio.

### Admin

| Rota | Tela |
|---|---|
| `/admin/login` | E-mail + senha |
| `/admin` | Lista de todos os ensaios (nome, região, data, status) + "Novo ensaio" |
| `/admin/ensaios/novo` | Nome, região, data, slug (sugerido, editável) e "Copiar lista de:" (ensaio existente ou nenhum) |
| `/admin/ensaios/:id` | Abas **Dados** (editar, encerrar/reabrir, excluir com confirmação), **Itens** (café/almoço: adicionar, editar, remover, reordenar, sabores) e **Contribuições** (filtrar por refeição/igreja, editar, excluir). Topo: botões "Copiar link" para Resumo, Café e Almoço. |
| `/admin/regioes` | Regiões e suas igrejas (adicionar, renomear, remover se não estiver em uso) |

- Rotas `/admin/*` (menos o login) ficam protegidas por `RequireAdmin`; sem sessão → `/admin/login`.
- O layout do admin é separado do layout público e não mostra o menu de ensaio.

## Estrutura do código

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/supabase.ts` | Cria o cliente a partir de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| `src/lib/ensaio-api.ts` | `fetchEnsaio(slug)`, `contribuir(...)`; converte o JSON das RPCs nos tipos do front |
| `src/lib/admin-api.ts` | CRUD de ensaios, itens, contribuições, regiões e igrejas; `copiarItens(origemId, destinoId)` |
| `src/lib/slug.ts` | `gerarSlug(regiao, data)` (sem acentos, minúsculas, hífens) |
| `src/hooks/use-ensaio.ts` | Substitui `use-quantities.ts`: carrega por slug, sincroniza (foco/visibilidade/30 s) e expõe `contribuir` |
| `src/hooks/use-session.ts` | Sessão do Supabase Auth para o admin |
| `src/data/ingredients.ts` | Tipos e regras puras: unidades, totais por item e por sabor somando contribuições, progresso, formatação. Sai o parsing do texto da planilha. |
| `src/components/*` (públicos) | `dashboard-page`, `meal-page`, `ingredients-table`, `contribute-dialog`, `app-sidebar`, `mobile-bottom-nav` recebem ensaio, igrejas e slug por props |
| `src/pages/public/*` | `home-page`, `ensaio-layout` (carrega o ensaio e renderiza as rotas filhas), `not-found` |
| `src/pages/admin/*` | `login`, `ensaios-list`, `ensaio-new`, `ensaio-detail` (+ abas), `regioes`, `require-admin` |
| `supabase/migrations/001_schema.sql` | Tabelas, índices, RLS, `ensaio_publico`, `contribuir`, grants |
| `supabase/tests/001_checks.sql` | Verificações de permissão e de regras (ver Testes) |
| `scripts/import-sheets.ts` | Importação única da planilha |

Removidos: `src/lib/api.ts`, `src/hooks/use-quantities.ts`, `apps-script/` (depois que a importação for validada), `VITE_APPS_SCRIPT_URL`.

## Importação da planilha

`scripts/import-sheets.ts`, rodado uma vez localmente com `tsx`:

- Entrada: a URL atual do Apps Script (`?action=get`), `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em variáveis de ambiente (nunca commitadas, nunca no front).
- Cria a região **Bombinhas** e as igrejas **Bombas**, **José Amândio** e **Zimbros**.
- Cria o ensaio "Ensaio Regional Bombinhas". A data e o slug são passados por argumento (ex.: `--data 2026-11-15`).
- Itens: converte `"10 kg"` → `qtd_necessaria = 10`, `unidade = 'kg'` (`pc`/`pct` → `pct`, `l` → `L`). Sabores vêm da coluna E ou das linhas `Pai::Sabor`. As linhas `Pai::Sabor` não viram itens.
- Contribuições: cada linha `Pessoa - Igreja - 3pct` da coluna D vira uma contribuição com `origem = 'importado'` e `sabor = null` (a planilha não registra o sabor por linha). Linhas com igreja desconhecida ou sem quantidade legível são listadas no relatório e entram no ajuste.
- Ajuste: para cada item, se o total da coluna C for maior que a soma das contribuições importadas, cria uma contribuição `origem = 'ajuste'`, `pessoa = 'Ajuste importado'`, `igreja_id = null`, `sabor = null`, com a diferença. Se a soma importada for **maior** que a coluna C, o relatório aponta a divergência e a importação para sem gravar.
- O detalhamento por sabor das linhas `Pai::Sabor` **não** é importado: no ensaio importado, essas quantidades aparecem como "sabor não informado". Contribuições novas pelo link registram o sabor normalmente.
- Ao final, imprime uma tabela comparando o total da planilha com o total do Supabase por item. A importação só é considerada válida se todos baterem.
- Não sobrescreve nada: se já existir um ensaio com o mesmo slug, aborta sem gravar. Região e igrejas são reaproveitadas se já existirem com o mesmo nome. Toda a gravação acontece em uma única chamada RPC administrativa (`importar_ensaio(jsonb)`, `execute` só para `service_role`), para ser tudo ou nada.

## Erros

- Falha de rede ou RPC: toast com a mensagem; a tela mantém os últimos dados carregados e mostra o aviso de erro de sincronização, como hoje.
- Contribuição recusada (ensaio encerrado, validação): toast com a mensagem do banco e recarga do ensaio.
- `.env` sem as variáveis do Supabase: tela de erro de configuração clara, no lugar da tela em branco.
- Admin com sessão expirada: redireciona para o login.

## Deploy

- `.env` / `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `.github/workflows/deploy-pages.yml`: troca o secret `VITE_APPS_SCRIPT_URL` pelos dois novos.
- O README é atualizado: setup do Supabase (rodar a migration, criar o admin, desativar o cadastro público) e a importação.

## Testes

- **Vitest** (novo): regras puras de `ingredients.ts` (totais e progresso por sabor, unidades inteiras/decimais, formatação), `slug.ts` (acentos, colisão) e o parser de importação (texto → item / contribuições / ajustes).
- **SQL** (`supabase/tests/001_checks.sql`, rodado no SQL Editor): como `anon`, `select` em `ensaios` retorna 0 linhas; `contribuir` falha em ensaio encerrado, com igreja de outra região, com quantidade ≤ 0, com sabor inválido e com decimal em unidade inteira; `ensaio_publico` de um slug inexistente retorna null.
- **Navegador** (manual guiado, ao final): login admin → criar o ensaio Itapema copiando de Bombinhas → copiar os 3 links → contribuir pelo link de café → ver o resumo atualizar → editar e excluir a contribuição no admin → encerrar e confirmar que o botão some → `/` não lista nada.
