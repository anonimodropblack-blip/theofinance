-- Lotes criados pela Sugestao de Pedido (fluxo "Fazer Pedido") nao entram
-- estoque na hora -- so quando a conta a pagar vinculada (ou todas as
-- parcelas dela) for quitada. estoque_confirmado marca se o estoque desse
-- lote ja foi lancado ou ainda ta pendente de pagamento. Lotes existentes e
-- os criados pelo fluxo "Novo Lote" continuam com o comportamento de sempre
-- (estoque entra na hora), por isso o default eh true.
alter table lotes add column if not exists estoque_confirmado boolean not null default true;
