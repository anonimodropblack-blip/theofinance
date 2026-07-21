-- Custo de Ads (anúncios) por produto, usado na projeção de margem/lucro.
-- Modo 'percentual' = % do preço de venda; modo 'valor' = valor fixo em R$ por unidade.
alter table produtos add column ads_modo text check (ads_modo in ('percentual', 'valor'));
alter table produtos add column ads_valor numeric(12,2);
