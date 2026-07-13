# Ensaio Regional — Controle de ingredientes

App para acompanhar o que já entrou e o que falta no café da manhã e no almoço do ensaio regional.

- Frontend: React + Vite + shadcn/ui
- Sync entre aparelhos: Google Sheets via Apps Script (sem banco de dados)
- Publicação: GitHub Pages

## URL prevista

https://felipe-barbero.github.io/ensaio_regional/

## Setup local

```bash
npm install
cp .env.example .env
# Edite .env e cole a URL do Apps Script
npm run dev
```

## 1. Preparar a planilha (é o “banco”)

A lista do site vem **100% da planilha**. Abas: `Cafe` e `Almoco`.

| Nome | Qtd Necessária | Qtd que Entrou | Sabores (opcional) |
|------|----------------|----------------|--------------------|

Detalhes em [`apps-script/PLANILHA.md`](apps-script/PLANILHA.md).

Ao adicionar um item novo na planilha, ele aparece no site no próximo sync (abrir a tela, botão atualizar ou a cada 30s).

## 2. Publicar o Apps Script

1. Na planilha: **Extensões → Apps Script**.
2. Apague o conteúdo padrão e cole o código de [`apps-script/Code.gs`](apps-script/Code.gs).
3. Salve o projeto.
4. (Opcional) No editor, selecione a função `setupSheets` e clique em **Executar** para criar as abas `Cafe` / `Almoco` com os itens.
5. **Implantar → Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Copie a URL que termina com `/exec`.

## 3. Configurar o front

No `.env` local:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
```

No GitHub: **Settings → Secrets and variables → Actions** → crie o secret `VITE_APPS_SCRIPT_URL` com a mesma URL.

## 4. GitHub Pages

1. **Settings → Pages → Build and deployment**: Source = **GitHub Actions**.
2. Faça push na branch `main` ou `teste-api` (o workflow em `.github/workflows/deploy-pages.yml` faz o build e o deploy).

## Como usar no evento

1. Abra o link do GitHub Pages no celular/PC.
2. Use o menu lateral: **Café da Manhã** ou **Almoço**.
3. Preencha **Qtd que entrou** e saia do campo (ou Enter) — salva na planilha.
4. Os outros aparelhos atualizam sozinhos a cada ~4 segundos (ou pelo botão **Atualizar**).

## Observações

- Quem tem o link pode editar (não há login).
- A lista de nomes/quantidades necessárias também está no código (`src/data/ingredients.ts`); a planilha é a fonte da verdade para **Qtd que entrou**.
