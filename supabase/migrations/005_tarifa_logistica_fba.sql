-- Peso do produto (necessário pra calcular tarifa de logística por faixa)
alter table produtos add column peso_gramas integer;

-- Marca qual local usa o modelo real de tarifa da Amazon FBA (comissão % +
-- tarifa de logística fixa por peso/preço) em vez de uma % única simples.
alter table locais_estoque add column usa_tarifa_fba boolean not null default false;

-- Liga/desliga a cobrança da tarifa de logística FBA. Fica desligado por
-- padrão porque o Leandro está no período promocional gratuito (1 ano) —
-- ele mesmo liga quando a promoção acabar. A comissão % continua sendo
-- cobrada sempre, independente desse interruptor.
alter table locais_estoque add column fba_logistica_ativa boolean not null default false;

-- Tarifa de logística FBA: valor fixo em R$ por unidade, conforme faixa de
-- peso do produto e faixa de preço de venda (tabela oficial Amazon Brasil,
-- pesquisada em 18/07/2026 pra produtos leves 100-300g — ajustar se a
-- Amazon atualizar os valores).
create table faixas_logistica_fba (
  id uuid primary key default gen_random_uuid(),
  peso_min integer not null,
  peso_max integer, -- null = sem limite superior
  preco_min numeric(12,2) not null,
  preco_max numeric(12,2), -- null = sem limite superior
  valor_fixo numeric(12,2) not null,
  created_at timestamptz not null default now()
);

alter table faixas_logistica_fba enable row level security;
create policy "authenticated_full_access" on faixas_logistica_fba for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Faixa 100-200g (aproximada pra baixo, cobre também produtos mais leves que 100g)
insert into faixas_logistica_fba (peso_min, peso_max, preco_min, preco_max, valor_fixo) values
  (0, 200, 0, 29.99, 10.45),
  (0, 200, 30, 49.99, 12.45),
  (0, 200, 50, 78.99, 14.45),
  (0, 200, 79, 99.99, 15.45),
  (0, 200, 100, null, 16.05);

-- Faixa 200-300g (sem limite superior — aproximação pra produtos mais pesados até ter dado real)
insert into faixas_logistica_fba (peso_min, peso_max, preco_min, preco_max, valor_fixo) values
  (201, null, 0, 29.99, 10.95),
  (201, null, 30, 49.99, 12.95),
  (201, null, 50, 78.99, 14.95),
  (201, null, 79, 99.99, 15.95),
  (201, null, 100, null, 16.55);

-- Amazon FBA passa a usar o modelo real: comissão 12% (categoria Saúde e
-- Cuidados Pessoais) + tarifa de logística (desligada por enquanto)
update locais_estoque set taxa_marketplace = 12, usa_tarifa_fba = true where nome = 'Amazon FBA';
