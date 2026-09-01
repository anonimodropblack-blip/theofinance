-- Margem máxima: teto opcional de margem saudável, mesmo tratamento visual da margem
-- mínima (linha fica em alerta quando a margem passa do teto — preço alto demais ou
-- oportunidade de baixar preço pra vender mais). Nulo = sem teto definido.
alter table configuracoes add column margem_maxima_percentual numeric(5,2);

-- Gasto real com ads por venda (pedido) — quanto custou de verdade em anúncios pra
-- fazer aquela venda, pra saber se deu lucro de verdade (a estimativa em
-- produtos.ads_modo/ads_valor é só previsão pra precificar antes de vender).
alter table pedidos add column gasto_ads numeric(12,2);

-- Acumula o gasto real de ads junto da quantidade em vendas_mes_canal (mesmo mecanismo
-- de somarVendaMesCanal que já soma quantidade a cada pedido confirmado/revertido) — assim
-- a projeção de margem em Produtos/Dashboard usa o ads real acumulado no lugar da
-- estimativa, quando existir.
alter table vendas_mes_canal add column gasto_ads numeric(12,2) not null default 0;
