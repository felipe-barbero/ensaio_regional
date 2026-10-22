-- Verificações de regras e permissões.
-- Rode inteiro no SQL Editor do Supabase. Tudo acontece em uma transação
-- com ROLLBACK no final: nenhum dado de teste fica no banco.
-- Resultado esperado: só mensagens "OK: ..." e nenhuma "FALHOU: ...".

begin;

create function pg_temp.expect_error(p_sql text, p_msg text, p_nome text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_msg in sqlerrm) > 0 then
      raise notice 'OK: %', p_nome;
      return;
    end if;
    raise exception 'FALHOU: % (erro inesperado: %)', p_nome, sqlerrm;
  end;
  raise exception 'FALHOU: % (não deu erro)', p_nome;
end $$;

-- Seed
insert into regioes (id, nome) values
  ('00000000-0000-0000-0000-00000000000a', 'Teste A'),
  ('00000000-0000-0000-0000-00000000000b', 'Teste B');
insert into igrejas (id, regiao_id, nome) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'A1'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'B1');
insert into ensaios (id, regiao_id, nome, slug, data, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'Aberto', 'teste-2099-01-01', '2099-01-01', 'aberto'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', 'Encerrado', 'teste-2099-01-02', '2099-01-02', 'encerrado');
insert into itens (id, ensaio_id, refeicao, nome, qtd_necessaria, unidade, sabores, ordem) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000e1', 'cafe', 'Açúcar', 10, 'kg', '{}', 0),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000e1', 'cafe', 'Pão', 500, 'un', '{}', 1),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000e1', 'cafe', 'Bolo', 18, 'un', '{Chocolate}', 2),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000e2', 'cafe', 'Açúcar', 10, 'kg', '{}', 0);

do $$
declare
  r jsonb;
begin
  if ensaio_publico('nao-existe') is not null then
    raise exception 'FALHOU: slug inexistente retorna null';
  end if;
  raise notice 'OK: slug inexistente retorna null';

  r := ensaio_publico('  TESTE-2099-01-01 ');
  if r is null or r->'ensaio'->>'slug' <> 'teste-2099-01-01' then
    raise exception 'FALHOU: slug com maiúsculas/espaços';
  end if;
  raise notice 'OK: slug com maiúsculas/espaços';

  if jsonb_array_length(r->'igrejas') <> 1 or r->'igrejas'->0->>'nome' <> 'A1' then
    raise exception 'FALHOU: igrejas só da região do ensaio';
  end if;
  raise notice 'OK: igrejas só da região do ensaio';

  if jsonb_typeof(r->'contribuicoes') <> 'array' or jsonb_array_length(r->'itens') <> 3 then
    raise exception 'FALHOU: arrays do payload';
  end if;
  raise notice 'OK: arrays do payload';
end $$;

select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-02', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 1)$q$,
  'Ensaio encerrado', 'ensaio encerrado recusa');
select pg_temp.expect_error(
  $q$select contribuir('nao-existe', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 1)$q$,
  'Ensaio não encontrado', 'ensaio inexistente recusa');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000b1', 'Ana', null, 1)$q$,
  'Igreja não pertence à região do ensaio', 'igreja de outra região');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 1)$q$,
  'Item não pertence a este ensaio', 'item de outro ensaio');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', '   ', null, 1)$q$,
  'Informe o seu nome (até 80 caracteres)', 'nome só com espaços');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', repeat('x', 81), null, 1)$q$,
  'Informe o seu nome (até 80 caracteres)', 'nome com 81 caracteres');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 0)$q$,
  'Quantidade inválida', 'quantidade zero');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, -1)$q$,
  'Quantidade inválida', 'quantidade negativa');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 1.5)$q$,
  'Quantidade inválida', 'decimal em unidade inteira');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 1.2345)$q$,
  'Quantidade inválida', 'mais de 3 casas decimais');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000a1', 'Ana', null, 1)$q$,
  'Selecione o sabor', 'item com sabores exige sabor');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'Morango', 1)$q$,
  'Sabor inválido', 'sabor fora da lista');
select pg_temp.expect_error(
  $q$select contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'X', 1)$q$,
  'Sabor inválido', 'sabor em item sem sabores');

do $$
declare
  r jsonb;
begin
  r := contribuir('teste-2099-01-01', '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-0000000000a1', '  Ana  ', null, 1.5);
  if jsonb_array_length(r->'contribuicoes') <> 1
     or r->'contribuicoes'->0->>'pessoa' <> 'Ana'
     or (r->'contribuicoes'->0->>'quantidade')::numeric <> 1.5
     or r->'contribuicoes'->0->>'igreja_nome' <> 'A1'
     or r->'contribuicoes'->0->>'origem' <> 'link' then
    raise exception 'FALHOU: contribuição válida (%)', r->'contribuicoes';
  end if;
  raise notice 'OK: contribuição válida grava e devolve o ensaio';
end $$;

-- Permissões do público (anon)
set local role anon;

do $$
declare
  n int;
begin
  select count(*) into n from ensaios;
  if n <> 0 then
    raise exception 'FALHOU: anon não lista ensaios (viu %)', n;
  end if;
  raise notice 'OK: anon não lista ensaios';

  if ensaio_publico('teste-2099-01-01') is null then
    raise exception 'FALHOU: anon lê ensaio pelo slug';
  end if;
  raise notice 'OK: anon lê ensaio pelo slug';
end $$;

select pg_temp.expect_error(
  $q$insert into contribuicoes (item_id, igreja_id, pessoa, quantidade) values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Hacker', 999)$q$,
  'row-level security', 'anon não grava direto na tabela');
select pg_temp.expect_error(
  $q$select importar_ensaio('{}'::jsonb)$q$,
  'permission denied', 'anon não executa importar_ensaio');

reset role;

rollback;
