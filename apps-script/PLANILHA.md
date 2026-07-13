# Planilha = banco de dados do app

Abas obrigatórias: `Cafe` e `Almoco`

## Colunas

| A Nome | B Qtd Necessária | C Qtd que Entrou | D Sabores (opcional) |
|--------|------------------|------------------|----------------------|
| Açúcar | 10 kg | | |
| Bolo | 18 un | | Chocolate, Cenoura, Cuca |
| Leite | 36 L | | |

- **Nome** e **Qtd Necessária**: o site lista exatamente o que estiver aqui.
- **Qtd que Entrou**: preenchida pelo app ao contribuir (não edite para diminuir pelo site).
- **Sabores**: opcional; use vírgula. Ex.: `Chocolate, Cenoura, Cuca`.

## Sabores (alternativa)

Além da coluna D, pode criar linhas auxiliares:

- `Bolo::Chocolate`
- `Bolo::Cenoura`
- `Bolo::Cuca`

Essas linhas não aparecem como item separado; viram opções de radio do `Bolo`.

## Unidades

Use no campo B: `kg`, `L`, `un`, `pc`, `cx`, `ml` — o app segue o mesmo padrão no lançamento.
