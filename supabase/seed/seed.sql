-- Dados de TESTE: 2 regiões, 3 ensaios (2 abertos, 1 encerrado), itens e contribuições.
-- Rode no SQL Editor do Supabase. Para apagar tudo depois: supabase/seed/truncate.sql
--
-- Links gerados:
--   /ensaio_regional/e/bombinhas-2026-11-15        (aberto, com contribuições)
--   /ensaio_regional/e/itapema-2026-12-06          (aberto, quase vazio)
--   /ensaio_regional/e/bombinhas-2026-05-10        (encerrado)

do $$
declare
  r_bombinhas uuid;
  r_itapema uuid;
  e_bomb uuid;
  e_itap uuid;
  e_old uuid;
  g_bombas uuid;
  g_jose uuid;
  g_zimbros uuid;
  g_centro uuid;
  g_meia uuid;
  g_morretes uuid;
begin
  if exists (select 1 from ensaios where slug in (
    'bombinhas-2026-11-15', 'itapema-2026-12-06', 'bombinhas-2026-05-10'
  )) then
    raise exception 'Seed já aplicado (slugs existem). Rode o truncate antes.';
  end if;

  -- Regiões e igrejas ---------------------------------------------------------
  insert into regioes (nome) values ('Bombinhas') returning id into r_bombinhas;
  insert into regioes (nome) values ('Itapema') returning id into r_itapema;

  insert into igrejas (regiao_id, nome) values (r_bombinhas, 'Bombas') returning id into g_bombas;
  insert into igrejas (regiao_id, nome) values (r_bombinhas, 'José Amândio') returning id into g_jose;
  insert into igrejas (regiao_id, nome) values (r_bombinhas, 'Zimbros') returning id into g_zimbros;

  insert into igrejas (regiao_id, nome) values (r_itapema, 'Centro') returning id into g_centro;
  insert into igrejas (regiao_id, nome) values (r_itapema, 'Meia Praia') returning id into g_meia;
  insert into igrejas (regiao_id, nome) values (r_itapema, 'Morretes') returning id into g_morretes;
  insert into igrejas (regiao_id, nome) values
    (r_itapema, 'Várzea'),
    (r_itapema, 'Casa Branca');

  -- Ensaios -------------------------------------------------------------------
  insert into ensaios (regiao_id, nome, slug, data, status)
  values (r_bombinhas, 'Ensaio Regional Bombinhas', 'bombinhas-2026-11-15', '2026-11-15', 'aberto')
  returning id into e_bomb;

  insert into ensaios (regiao_id, nome, slug, data, status)
  values (r_itapema, 'Ensaio Regional Itapema', 'itapema-2026-12-06', '2026-12-06', 'aberto')
  returning id into e_itap;

  insert into ensaios (regiao_id, nome, slug, data, status)
  values (r_bombinhas, 'Ensaio Regional Bombinhas', 'bombinhas-2026-05-10', '2026-05-10', 'encerrado')
  returning id into e_old;

  -- Itens: a mesma lista nos três ensaios ------------------------------------
  insert into itens (ensaio_id, refeicao, nome, qtd_necessaria, unidade, sabores, ordem)
  select e.id, i.refeicao, i.nome, i.qtd, i.unidade, i.sabores, i.ordem
  from (values (e_bomb), (e_itap), (e_old)) as e(id)
  cross join (values
    ('cafe',   'Açúcar refinado',      10::numeric,  'kg',  '{}'::text[],                      0),
    ('cafe',   'Café tradicional',     4,            'pct', '{}',                              1),
    ('cafe',   'Leite',                36,           'L',   '{}',                              2),
    ('cafe',   'Presunto fatiado',     2,            'kg',  '{}',                              3),
    ('cafe',   'Queijo fatiado',       2,            'kg',  '{}',                              4),
    ('cafe',   'Banana',               3,            'kg',  '{}',                              5),
    ('cafe',   'Bolo',                 18,           'un',  '{Chocolate,Cenoura,Cuca}',        6),
    ('cafe',   'Pão',                  500,          'un',  '{}',                              7),
    ('cafe',   'Copo descartável',     400,          'un',  '{}',                              8),
    ('cafe',   'Luva',                 1,            'cx',  '{}',                              9),
    ('almoco', 'Feijão Preto',         10,           'kg',  '{}',                              0),
    ('almoco', 'Arroz amarelo',        20,           'kg',  '{}',                              1),
    ('almoco', 'Óleo',                 10,           'L',   '{}',                              2),
    ('almoco', 'Calabresa',            15,           'kg',  '{}',                              3),
    ('almoco', 'Ovos',                 150,          'un',  '{}',                              4),
    ('almoco', 'Couve folha (maços)',  10,           '',    '{}',                              5),
    ('almoco', 'Refrigerante',         100,          'L',   '{}',                              6),
    ('almoco', 'Suco',                 40,           'L',   '{Maracujá,Uva}',                  7),
    ('almoco', 'Marmitas 500 ml',      200,          'un',  '{}',                              8),
    ('almoco', 'Garfos descartáveis',  400,          'un',  '{}',                              9)
  ) as i(refeicao, nome, qtd, unidade, sabores, ordem);

  -- Contribuições: Bombinhas (vários estados: completo, parcial, pendente) ----
  insert into contribuicoes (item_id, igreja_id, pessoa, sabor, quantidade, origem, criado_em)
  select it.id, c.igreja, c.pessoa, c.sabor, c.qtd, 'link', now() - c.atraso
  from (values
    ('cafe',   'Açúcar refinado',  g_zimbros, 'Felipe',            null,        6::numeric, interval '3 days'),
    ('cafe',   'Açúcar refinado',  g_bombas,  'Alcenir',           null,        4,          interval '2 days'),
    ('cafe',   'Café tradicional', g_jose,    'Fabiane',           null,        2,          interval '2 days'),
    ('cafe',   'Leite',            g_bombas,  'Davi',              null,        12,         interval '40 hours'),
    ('cafe',   'Leite',            g_jose,    'Jheniffer',         null,        12.5,       interval '30 hours'),
    ('cafe',   'Presunto fatiado', g_zimbros, 'Luanna',            null,        1.5,        interval '1 day'),
    ('cafe',   'Bolo',             g_bombas,  'Cléia',             'Chocolate', 5,          interval '20 hours'),
    ('cafe',   'Bolo',             g_jose,    'Cássia',            'Cenoura',   5,          interval '18 hours'),
    ('cafe',   'Bolo',             g_zimbros, 'Danir',             'Cuca',      3,          interval '10 hours'),
    ('cafe',   'Pão',              g_bombas,  'Edson',             null,        200,        interval '8 hours'),
    ('almoco', 'Feijão Preto',     g_bombas,  'Alcenir',           null,        10,         interval '3 days'),
    ('almoco', 'Arroz amarelo',    g_jose,    'Anderson Feliciano', null,       20,         interval '2 days'),
    ('almoco', 'Óleo',             g_jose,    'Jheniffer',         null,        2,          interval '30 hours'),
    ('almoco', 'Calabresa',        g_jose,    'Cássia Schulz',     null,        2,          interval '1 day'),
    ('almoco', 'Ovos',             g_jose,    'Jheniffer',         null,        30,         interval '12 hours'),
    ('almoco', 'Couve folha (maços)', g_bombas, 'Luan Braz',       null,        10,         interval '6 hours'),
    ('almoco', 'Refrigerante',     g_bombas,  'Fernando',          null,        6,          interval '5 hours'),
    ('almoco', 'Suco',             g_jose,    'Anderson',          'Maracujá',  20,         interval '3 hours'),
    ('almoco', 'Marmitas 500 ml',  g_bombas,  'Cléia F. Corrêa',   null,        200,        interval '1 hour')
  ) as c(refeicao, item, igreja, pessoa, sabor, qtd, atraso)
  join itens it on it.ensaio_id = e_bomb and it.refeicao = c.refeicao and it.nome = c.item;

  -- Itapema: só duas contribuições --------------------------------------------
  insert into contribuicoes (item_id, igreja_id, pessoa, sabor, quantidade, origem, criado_em)
  select it.id, c.igreja, c.pessoa, null, c.qtd, 'link', now() - c.atraso
  from (values
    ('cafe',   'Leite',        g_centro,   'Maria',  10::numeric, interval '2 hours'),
    ('almoco', 'Arroz amarelo', g_meia,    'João',   5,           interval '1 hour')
  ) as c(refeicao, item, igreja, pessoa, qtd, atraso)
  join itens it on it.ensaio_id = e_itap and it.refeicao = c.refeicao and it.nome = c.item;

  -- Encerrado: uma contribuição comum e um ajuste sem igreja ------------------
  insert into contribuicoes (item_id, igreja_id, pessoa, quantidade, origem, criado_em)
  select it.id, null, 'Ajuste importado', 36, 'ajuste', '2026-05-09 15:00-03'::timestamptz
  from itens it
  where it.ensaio_id = e_old and it.refeicao = 'cafe' and it.nome = 'Leite';

  insert into contribuicoes (item_id, igreja_id, pessoa, quantidade, origem, criado_em)
  select it.id, g_zimbros, 'Felipe', 300, 'link', '2026-05-09 14:00-03'::timestamptz
  from itens it
  where it.ensaio_id = e_old and it.refeicao = 'cafe' and it.nome = 'Pão';

  raise notice 'Seed OK: Bombinhas (aberto), Itapema (aberto), Bombinhas 2026-05-10 (encerrado)';
end $$;
