-- Substitui a taxa de marketplace padrão fixa (migration 003) por uma tabela
-- de faixas por preço de venda — comissão degressiva: quanto mais barato o
-- produto, maior a taxa % (ex: Mercado Livre Clássico). Usada na projeção de
-- lucro da tela de Produtos. Não afeta Precificação/Dashboard, que usam a
-- taxa real de cada marketplace em locais_estoque.taxa_marketplace.
alter table configuracoes drop column taxa_marketplace_padrao_percentual;

create table faixas_taxa_marketplace (
  id uuid primary key default gen_random_uuid(),
  ate_valor numeric(12,2), -- preço de venda até esse valor (exclusive) usa essa taxa; null = última faixa, sem limite superior
  taxa_percentual numeric(5,2) not null,
  created_at timestamptz not null default now()
);

alter table faixas_taxa_marketplace enable row level security;
create policy "authenticated_full_access" on faixas_taxa_marketplace for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into faixas_taxa_marketplace (ate_valor, taxa_percentual) values
  (20, 50),
  (30, 40),
  (50, 32),
  (null, 25);
