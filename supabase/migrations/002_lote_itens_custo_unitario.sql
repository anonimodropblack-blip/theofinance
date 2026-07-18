-- Custo de aquisição por unidade, informado ao adicionar o produto no lote
alter table lote_itens add column custo_unitario numeric(12,2);
