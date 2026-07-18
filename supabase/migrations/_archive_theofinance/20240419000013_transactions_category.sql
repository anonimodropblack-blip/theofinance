-- Fix: garante coluna `category` (texto livre) em transactions.
-- O código da API (/api/transactions, /api/analytics/overview, /api/feed, etc.)
-- já lê/escreve esse campo desde a Fase 6, mas nenhuma migration anterior o
-- criou no banco. Rodar este arquivo é seguro e idempotente.

alter table transactions
  add column if not exists category text;

create index if not exists idx_transactions_category on transactions(category);
