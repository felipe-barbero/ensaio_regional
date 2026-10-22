-- Ensaio Regional — schema inicial
-- Rode no SQL Editor do Supabase (ou via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table regioes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  criado_em  timestamptz not null default now()
);

create table igrejas (
  id         uuid primary key default gen_random_uuid(),
  regiao_id  uuid not null references regioes on delete restrict,
  nome       text not null,
  unique (regiao_id, nome)
);

create table ensaios (
  id         uuid primary key default gen_random_uuid(),
  regiao_id  uuid not null references regioes on delete restrict,
  nome       text not null,
  slug       text not null unique,
  data       date not null,
  status     text not null default 'aberto' check (status in ('aberto', 'encerrado')),
  criado_em  timestamptz not null default now()
);

create table itens (
  id              uuid primary key default gen_random_uuid(),
  ensaio_id       uuid not null references ensaios on delete cascade,
  refeicao        text not null check (refeicao in ('cafe', 'almoco')),
  nome            text not null,
  qtd_necessaria  numeric check (qtd_necessaria is null or qtd_necessaria > 0),
  unidade         text not null default '' check (unidade in ('kg', 'L', 'un', 'pct', 'cx', 'ml', '')),
  sabores         text[] not null default '{}',
  ordem           int not null default 0,
  unique (ensaio_id, refeicao, nome)
);

create table contribuicoes (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references itens on delete cascade,
  igreja_id   uuid references igrejas on delete restrict,
  pessoa      text not null check (char_length(pessoa) between 1 and 80),
  sabor       text,
  quantidade  numeric not null check (quantidade > 0),
  origem      text not null default 'link' check (origem in ('link', 'importado', 'ajuste')),
  criado_em   timestamptz not null default now(),
  check (igreja_id is not null or origem = 'ajuste')
);

create index igrejas_regiao_idx on igrejas (regiao_id);
create index itens_ensaio_idx on itens (ensaio_id, refeicao, ordem);
create index contribuicoes_item_idx on contribuicoes (item_id);
create index contribuicoes_criado_idx on contribuicoes (criado_em desc);

-- ---------------------------------------------------------------------------
-- RLS: só admin (authenticated) acessa as tabelas. anon não tem policy.
-- ---------------------------------------------------------------------------

alter table regioes enable row level security;
alter table igrejas enable row level security;
alter table ensaios enable row level security;
alter table itens enable row level security;
alter table contribuicoes enable row level security;

create policy admin_all on regioes for all to authenticated using (true) with check (true);
create policy admin_all on igrejas for all to authenticated using (true) with check (true);
create policy admin_all on ensaios for all to authenticated using (true) with check (true);
create policy admin_all on itens for all to authenticated using (true) with check (true);
create policy admin_all on contribuicoes for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- ensaio_publico: tudo de um ensaio, pelo slug (null se não existir)
-- ---------------------------------------------------------------------------

create function ensaio_publico(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ensaio ensaios;
  v_regiao regioes;
begin
  select * into v_ensaio from ensaios where slug = lower(trim(p_slug));
  if not found then
    return null;
  end if;
  select * into v_regiao from regioes where id = v_ensaio.regiao_id;

  return jsonb_build_object(
    'ensaio', jsonb_build_object(
      'id', v_ensaio.id,
      'nome', v_ensaio.nome,
      'slug', v_ensaio.slug,
      'data', v_ensaio.data,
      'status', v_ensaio.status,
      'regiao', jsonb_build_object('id', v_regiao.id, 'nome', v_regiao.nome)
    ),
    'igrejas', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome) order by g.nome)
      from igrejas g
      where g.regiao_id = v_ensaio.regiao_id
    ), '[]'::jsonb),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'refeicao', i.refeicao,
        'nome', i.nome,
        'qtd_necessaria', i.qtd_necessaria,
        'unidade', i.unidade,
        'sabores', to_jsonb(i.sabores),
        'ordem', i.ordem
      ) order by i.refeicao, i.ordem, i.nome)
      from itens i
      where i.ensaio_id = v_ensaio.id
    ), '[]'::jsonb),
    'contribuicoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'item_id', c.item_id,
        'igreja_id', c.igreja_id,
        'igreja_nome', g.nome,
        'pessoa', c.pessoa,
        'sabor', c.sabor,
        'quantidade', c.quantidade,
        'origem', c.origem,
        'criado_em', c.criado_em
      ) order by c.criado_em desc, c.id)
      from contribuicoes c
      join itens i on i.id = c.item_id
      left join igrejas g on g.id = c.igreja_id
      where i.ensaio_id = v_ensaio.id
    ), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------------
-- contribuir: única forma de o público gravar
-- ---------------------------------------------------------------------------

create function contribuir(
  p_slug text,
  p_item_id uuid,
  p_igreja_id uuid,
  p_pessoa text,
  p_sabor text,
  p_quantidade numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ensaio ensaios;
  v_item itens;
  v_pessoa text := trim(coalesce(p_pessoa, ''));
  v_sabor text := nullif(trim(coalesce(p_sabor, '')), '');
begin
  select * into v_ensaio from ensaios where slug = lower(trim(p_slug));
  if not found then
    raise exception 'Ensaio não encontrado';
  end if;
  if v_ensaio.status <> 'aberto' then
    raise exception 'Ensaio encerrado';
  end if;

  select * into v_item from itens where id = p_item_id and ensaio_id = v_ensaio.id;
  if not found then
    raise exception 'Item não pertence a este ensaio';
  end if;

  if not exists (
    select 1 from igrejas where id = p_igreja_id and regiao_id = v_ensaio.regiao_id
  ) then
    raise exception 'Igreja não pertence à região do ensaio';
  end if;

  if char_length(v_pessoa) = 0 or char_length(v_pessoa) > 80 then
    raise exception 'Informe o seu nome (até 80 caracteres)';
  end if;

  if p_quantidade is null
     or p_quantidade <= 0
     or (v_item.unidade not in ('kg', 'L') and p_quantidade <> trunc(p_quantidade))
     or p_quantidade <> round(p_quantidade, 3) then
    raise exception 'Quantidade inválida';
  end if;

  if cardinality(v_item.sabores) > 0 then
    if v_sabor is null then
      raise exception 'Selecione o sabor';
    end if;
    if not (v_sabor = any (v_item.sabores)) then
      raise exception 'Sabor inválido';
    end if;
  elsif v_sabor is not null then
    raise exception 'Sabor inválido';
  end if;

  insert into contribuicoes (item_id, igreja_id, pessoa, sabor, quantidade, origem)
  values (v_item.id, p_igreja_id, v_pessoa, v_sabor, p_quantidade, 'link');

  return ensaio_publico(v_ensaio.slug);
end $$;

-- ---------------------------------------------------------------------------
-- importar_ensaio: importação única da planilha (só service_role)
-- ---------------------------------------------------------------------------

create function importar_ensaio(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_regiao_id uuid;
  v_ensaio_id uuid;
  v_item_id uuid;
  v_nome text;
  v_item jsonb;
  v_contrib jsonb;
  v_slug text := lower(trim(p->'ensaio'->>'slug'));
begin
  if exists (select 1 from ensaios where slug = v_slug) then
    raise exception 'Slug já existe: %', v_slug;
  end if;

  select id into v_regiao_id from regioes where nome = p->>'regiao';
  if v_regiao_id is null then
    insert into regioes (nome) values (p->>'regiao') returning id into v_regiao_id;
  end if;

  for v_nome in select jsonb_array_elements_text(p->'igrejas') loop
    insert into igrejas (regiao_id, nome) values (v_regiao_id, v_nome)
    on conflict (regiao_id, nome) do nothing;
  end loop;

  insert into ensaios (regiao_id, nome, slug, data)
  values (v_regiao_id, p->'ensaio'->>'nome', v_slug, (p->'ensaio'->>'data')::date)
  returning id into v_ensaio_id;

  for v_item in select * from jsonb_array_elements(p->'itens') loop
    insert into itens (ensaio_id, refeicao, nome, qtd_necessaria, unidade, sabores, ordem)
    values (
      v_ensaio_id,
      v_item->>'refeicao',
      v_item->>'nome',
      (v_item->>'qtd_necessaria')::numeric,
      coalesce(v_item->>'unidade', ''),
      coalesce(array(select jsonb_array_elements_text(v_item->'sabores')), '{}'),
      coalesce((v_item->>'ordem')::int, 0)
    )
    returning id into v_item_id;

    for v_contrib in select * from jsonb_array_elements(coalesce(v_item->'contribuicoes', '[]'::jsonb)) loop
      insert into contribuicoes (item_id, igreja_id, pessoa, quantidade, origem)
      values (
        v_item_id,
        (select id from igrejas where regiao_id = v_regiao_id and nome = v_contrib->>'igreja'),
        v_contrib->>'pessoa',
        (v_contrib->>'quantidade')::numeric,
        v_contrib->>'origem'
      );
    end loop;
  end loop;

  return v_ensaio_id;
end $$;

-- ---------------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------------

-- O Supabase concede EXECUTE a anon/authenticated por padrão: revogar explicitamente.
revoke all on function ensaio_publico(text) from public, anon, authenticated;
revoke all on function contribuir(text, uuid, uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function importar_ensaio(jsonb) from public, anon, authenticated;

grant execute on function ensaio_publico(text) to anon, authenticated;
grant execute on function contribuir(text, uuid, uuid, text, text, numeric) to anon, authenticated;
grant execute on function importar_ensaio(jsonb) to service_role;
