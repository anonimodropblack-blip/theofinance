-- ============================================================
-- Confirmacao de recebimento (perda/avaria) pra movimentacoes tipo envio.
-- So registra -- nao mexe em estoque automaticamente.
-- ============================================================

alter table movimentacoes add column if not exists qtd_confirmada int;
alter table movimentacoes add column if not exists motivo_diferenca text;
