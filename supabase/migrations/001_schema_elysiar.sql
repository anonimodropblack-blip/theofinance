-- ERP Elysiar — schema inicial
-- Uso único (sem multi-tenant): RLS libera qualquer usuário autenticado.

create extension if not exists "pgcrypto";

-- ============================================================
-- PRODUTOS
-- ============================================================
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  fabricante text,
  sku text,
  preco_venda numeric(12,2),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- LOCAIS DE ESTOQUE (Casa + marketplaces)
-- ============================================================
create table locais_estoque (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'marketplace' check (tipo in ('proprio', 'marketplace')),
  taxa_marketplace numeric(5,2),
  ativo boolean not null default true,
  ordem int not null default 0
);

-- ============================================================
-- ESTOQUE (saldo por produto x local)
-- ============================================================
create table estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  local_id uuid not null references locais_estoque(id) on delete cascade,
  quantidade int not null default 0,
  unique (produto_id, local_id)
);

-- ============================================================
-- LOTES
-- ============================================================
create table lotes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  fornecedor text not null,
  data date not null,
  created_at timestamptz not null default now()
);

create table lote_itens (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade int not null check (quantidade > 0)
);

-- ============================================================
-- CATEGORIAS DE CUSTO (padrão + customizadas pelo usuário)
-- ============================================================
create table categorias_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  padrao boolean not null default false,
  created_at timestamptz not null default now()
);

create table lote_custos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes(id) on delete cascade,
  categoria_id uuid not null references categorias_custo(id) on delete restrict,
  modo text not null default 'total' check (modo in ('total', 'por_unidade')),
  valor numeric(12,2) not null,
  descricao text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
create table movimentacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada_lote', 'envio', 'ajuste')),
  quantidade int not null,
  origem_local_id uuid references locais_estoque(id),
  destino_local_id uuid references locais_estoque(id),
  lote_id uuid references lotes(id),
  observacao text,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CONFIGURAÇÕES (linha única)
-- ============================================================
create table configuracoes (
  id uuid primary key default gen_random_uuid(),
  imposto_percentual numeric(5,2) not null default 4,
  margem_minima_percentual numeric(5,2) not null default 10,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS — uso único: qualquer usuário autenticado tem acesso total
-- ============================================================
alter table produtos enable row level security;
alter table locais_estoque enable row level security;
alter table estoque enable row level security;
alter table lotes enable row level security;
alter table lote_itens enable row level security;
alter table categorias_custo enable row level security;
alter table lote_custos enable row level security;
alter table movimentacoes enable row level security;
alter table configuracoes enable row level security;

create policy "authenticated_full_access" on produtos for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on locais_estoque for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on estoque for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on lotes for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on lote_itens for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on categorias_custo for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on lote_custos for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on movimentacoes for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on configuracoes for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ============================================================
-- SEEDS
-- ============================================================
insert into categorias_custo (nome, ativo, padrao) values
  ('Frete', true, true),
  ('Embalagem', true, true),
  ('Caixa', true, true),
  ('Etiqueta', true, true),
  ('Prep Center', true, true),
  ('Outros', true, true);

insert into locais_estoque (nome, tipo, taxa_marketplace, ativo, ordem) values
  ('Casa', 'proprio', null, true, 0),
  ('Amazon FBA', 'marketplace', 15, true, 1),
  ('Mercado Livre Full', 'marketplace', 16, true, 2),
  ('Shopee', 'marketplace', 20, true, 3),
  ('TikTok', 'marketplace', 18, true, 4);

insert into configuracoes (imposto_percentual, margem_minima_percentual) values (4, 10);
