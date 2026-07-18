-- Campos de planejamento/projeção no cadastro do produto (planilha de viabilidade)
alter table produtos add column formula text;
alter table produtos add column tipo text;
alter table produtos add column qtd_minima integer;
alter table produtos add column preco_custo_unitario numeric(12,2);
alter table produtos add column vendas_mes integer;

-- Taxa média de marketplace usada na projeção de lucro da tela de Produtos
-- (a taxa exata por marketplace continua em locais_estoque.taxa_marketplace, usada na Precificação)
alter table configuracoes add column taxa_marketplace_padrao_percentual numeric(5,2) not null default 25;
