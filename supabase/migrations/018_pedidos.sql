-- Pedidos: registro real de vendas (produto x canal x quantidade x preço), pra lançar
-- venda por venda (ou em massa) em vez de só editar a estimativa mensal em
-- vendas_mes_canal. Fica como histórico consultável e alimenta o Faturamento/Lucro Real
-- do Dashboard, separado da projeção existente (que continua usando o preço cadastrado
-- do produto).
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  local_id uuid not null references locais_estoque(id),
  quantidade int not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  data date not null default current_date,
  observacao text,
  created_at timestamptz not null default now()
);

alter table pedidos enable row level security;
create policy "authenticated_full_access" on pedidos for all using (auth.uid() is not null) with check (auth.uid() is not null);
