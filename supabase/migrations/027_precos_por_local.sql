-- Preco de venda por canal: produtos.preco_venda continua sendo o preco padrao
-- (usado quando nao ha excecao), e essa tabela guarda so as excecoes por
-- produto x canal -- ex: preco mais alto na Amazon (comissao maior) e mais
-- baixo no Mercado Livre. Sem excecao cadastrada, usa sempre o padrao.
create table if not exists precos_por_local (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  local_id uuid not null references locais_estoque(id) on delete cascade,
  preco_venda numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique(produto_id, local_id)
);

alter table precos_por_local enable row level security;
drop policy if exists "authenticated_full_access" on precos_por_local;
create policy "authenticated_full_access" on precos_por_local for all using (auth.uid() is not null) with check (auth.uid() is not null);
