-- Percentual de crescimento aplicado em cima da sugestao basica de reposicao
-- (cobrir prazo de reposicao + cobertura desejada) -- usado na Sugestao de
-- Pedido em Lotes pra comprar um pouco mais do que so repor o que foi
-- vendido, enquanto o objetivo for crescer estoque/caixa.
alter table configuracoes add column if not exists crescimento_estoque_pct numeric(5,2) not null default 0;
