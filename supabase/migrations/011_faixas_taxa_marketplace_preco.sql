-- Faixas de taxa (comissão % + valor fixo R$) por faixa de preço de venda,
-- pra marketplaces que cobram assim (Mercado Livre, Shopee, TikTok) — modelo
-- diferente da Amazon FBA, que varia por peso (faixas_logistica_fba). Números
-- pesquisados em 20/07/2026, conferir na Central do Vendedor de cada
-- marketplace se parecerem desatualizados.
alter table locais_estoque add column usa_taxa_por_faixa boolean not null default false;

create table faixas_taxa_marketplace_preco (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references locais_estoque(id) on delete cascade,
  preco_min numeric(12,2) not null,
  preco_max numeric(12,2), -- null = sem limite superior
  taxa_percentual numeric(5,2) not null,
  valor_fixo numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table faixas_taxa_marketplace_preco enable row level security;
create policy "authenticated_full_access" on faixas_taxa_marketplace_preco for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Mercado Livre Full — categoria Saúde e Cuidados Pessoais: comissão 13% +
-- taxa fixa por faixa de preço (só até R$79, acima disso é só a comissão).
-- Faixa abaixo de R$12,50 (metade do valor do produto) não foi modelada —
-- nenhum produto do catálogo chega perto desse preço.
update locais_estoque set usa_taxa_por_faixa = true where nome = 'Mercado Livre Full';
insert into faixas_taxa_marketplace_preco (local_id, preco_min, preco_max, taxa_percentual, valor_fixo)
select id, preco_min, preco_max, 13, valor_fixo
from locais_estoque, (values
  (12.50, 29.00, 6.25),
  (29.00, 50.00, 6.50),
  (50.00, 79.00, 6.75),
  (79.00, null, 0)
) as v(preco_min, preco_max, valor_fixo)
where nome = 'Mercado Livre Full';

-- Shopee — comissão + valor fixo variam juntos por faixa de preço (já inclui
-- o programa de frete grátis obrigatório desde 01/03/2026).
update locais_estoque set usa_taxa_por_faixa = true where nome = 'Shopee';
insert into faixas_taxa_marketplace_preco (local_id, preco_min, preco_max, taxa_percentual, valor_fixo)
select id, preco_min, preco_max, taxa_percentual, valor_fixo
from locais_estoque, (values
  (0, 79.99, 20, 4),
  (80.00, 99.99, 14, 16),
  (100.00, 199.99, 14, 20),
  (200.00, null, 14, 26)
) as v(preco_min, preco_max, taxa_percentual, valor_fixo)
where nome = 'Shopee';

-- TikTok Shop — comissão por faixa de preço (10% abaixo de R$50, 6% a partir
-- de R$50) já somada aos 6% do programa de frete obrigatório; taxa fixa de
-- R$6 só na faixa de R$50+.
update locais_estoque set usa_taxa_por_faixa = true where nome = 'TikTok';
insert into faixas_taxa_marketplace_preco (local_id, preco_min, preco_max, taxa_percentual, valor_fixo)
select id, preco_min, preco_max, taxa_percentual, valor_fixo
from locais_estoque, (values
  (0, 49.99, 16, 0),
  (50.00, null, 12, 6)
) as v(preco_min, preco_max, taxa_percentual, valor_fixo)
where nome = 'TikTok';
