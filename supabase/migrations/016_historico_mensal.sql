-- Fechamento mensal: snapshot append-only. Nunca sobrescreve meses passados; só o mês
-- corrente pode ser re-fechado (delete+insert feito pela aplicação, com confirmação).
create table fechamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  mes_referencia date not null,              -- sempre dia 1, ex: 2026-07-01
  faturamento_bruto numeric(12,2) not null default 0,
  lucro_liquido numeric(12,2) not null default 0,
  gasto_ads numeric(12,2) not null default 0,
  investimento_total numeric(12,2) not null default 0,
  estoque_valor numeric(12,2) not null default 0,
  fechado_em timestamptz not null default now(),
  unique (mes_referencia)
);

-- Por produto (SKU) — snapshot pro pivot Produto x Mês.
create table fechamentos_mensais_produtos (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references fechamentos_mensais(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  produto_nome text not null,      -- snapshot: pivot continua legível mesmo se o produto for renomeado depois
  vendas_qtd int not null default 0,
  faturamento numeric(12,2) not null default 0,
  lucro numeric(12,2) not null default 0,
  margem_pct numeric(5,2),
  unique (fechamento_id, produto_id)
);

-- Por canal (marketplace) — snapshot pro pivot Canal x Mês.
create table fechamentos_mensais_canais (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references fechamentos_mensais(id) on delete cascade,
  local_id uuid not null references locais_estoque(id) on delete restrict,
  local_nome text not null,
  vendas_qtd int not null default 0,
  faturamento numeric(12,2) not null default 0,
  lucro numeric(12,2) not null default 0,
  unique (fechamento_id, local_id)
);

alter table fechamentos_mensais enable row level security;
alter table fechamentos_mensais_produtos enable row level security;
alter table fechamentos_mensais_canais enable row level security;
create policy "authenticated_full_access" on fechamentos_mensais for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on fechamentos_mensais_produtos for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on fechamentos_mensais_canais for all using (auth.uid() is not null) with check (auth.uid() is not null);
