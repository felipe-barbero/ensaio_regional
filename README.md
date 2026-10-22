# Ensaio Regional — Controle de ingredientes

App para acompanhar o que já entrou e o que falta no café da manhã e no almoço dos ensaios regionais.

- Cada **região** tem suas **igrejas** (ex.: Bombinhas → Bombas, José Amândio, Zimbros).
- Cada **ensaio** pertence a uma região e tem listas próprias de café e almoço.
- Cada ensaio tem links públicos para **Resumo**, **Café** e **Almoço**, para enviar nos grupos.
- Frontend: React + Vite + shadcn/ui, publicado no GitHub Pages
- Banco e login: Supabase

## URL

https://felipe-barbero.github.io/ensaio_regional/

- Público: `/ensaio_regional/e/<slug>`, `/e/<slug>/cafe` e `/e/<slug>/almoco` (ex.: `/e/itapema-2026-10-10/cafe`)
- Admin: `/ensaio_regional/admin`

A página inicial não lista ensaios: só quem tem o link (ou é admin) chega a um ensaio.

## Setup local

```bash
npm install
cp .env.example .env
# Edite .env com a chave pública (anon/publishable) do Supabase
npm run dev
```

```bash
npm test
```

## 1. Preparar o Supabase

1. No **SQL Editor**, rode [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql).
2. Rode [`supabase/tests/001_checks.sql`](supabase/tests/001_checks.sql): devem aparecer só mensagens `OK: ...` (é tudo desfeito no final).
   - Dados de teste: [`supabase/seed/seed.sql`](supabase/seed/seed.sql); para apagar tudo: [`supabase/seed/truncate.sql`](supabase/seed/truncate.sql).
3. **Authentication → Sign In / Providers**: desative *Allow new users to sign up* e mantenha *Anonymous sign-ins* desligado (qualquer usuário logado é admin).
4. **Authentication → Users → Add user**: crie o login de cada admin.
5. **Project Settings → API Keys**: copie a chave pública para `VITE_SUPABASE_ANON_KEY`.

A chave pública pode ficar no front. A chave `service_role`/secreta **nunca** vai para o repositório ou para o `.env`.

## 2. GitHub Pages

1. **Settings → Secrets and variables → Actions**: crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. **Settings → Pages → Build and deployment**: Source = **GitHub Actions**.
3. Faça push na branch `main`, `master` ou `teste-api` (o workflow em `.github/workflows/deploy-pages.yml` roda os testes, faz o build e o deploy).

## Como usar

1. Entre em `/admin` com seu e-mail e senha.
2. Em **Regiões**, cadastre a região e as igrejas dela.
3. Em **Ensaios → Novo ensaio**, escolha a região e a data. O link é sugerido (`regiao-AAAA-MM-DD`), e dá para **copiar a lista** de um ensaio anterior.
4. No ensaio, ajuste os **Itens** e use **Copiar link** (Resumo, Café, Almoço) para mandar nos grupos.
5. Quem abre o link contribui informando nome, igreja e quantidade. As telas atualizam sozinhas a cada 30 s ou ao voltar para a aba.
6. Na aba **Contribuições**, o admin corrige ou exclui lançamentos errados; os totais se recalculam.
7. Depois do evento, **Encerrar ensaio**: os links continuam mostrando as listas, mas não aceitam contribuições.

