-- Campos extras pra movimentações do tipo "envio": quantidade de caixas, código interno de
-- referência (não é rastreio de transportadora, é só organização do Leandro), motorista e o
-- custo de frete específico daquele envio (diferente do custo geral do lote).

alter table movimentacoes add column quantidade_caixas int;
alter table movimentacoes add column codigo_referencia text;
alter table movimentacoes add column motorista text;
alter table movimentacoes add column custo_frete numeric(12,2);
