-- ATENÇÃO: apaga TODOS os dados do app (regiões, igrejas, ensaios, itens e contribuições).
-- Não mexe no schema nem nos usuários admin do Supabase Auth.
truncate table contribuicoes, itens, ensaios, igrejas, regioes;
