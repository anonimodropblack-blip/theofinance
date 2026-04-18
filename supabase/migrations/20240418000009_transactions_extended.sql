-- Fase 6: transações completas
--  - subcategory (texto livre, complementa category)
--  - paid_by_user_id (quem pagou, entre os usuários do casal)
--  - to_account_id (para type='transfer', conta de destino)
--  - recurring_rule + recurring_until (recorrência real)
--  - accounts.is_private (oculta da visão casal)

alter table transactions
  add column if not exists subcategory text,
  add column if not exists paid_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists to_account_id uuid references accounts(id) on delete set null,
  add column if not exists recurring_rule text
    check (recurring_rule is null or recurring_rule in ('weekly','biweekly','monthly','bimonthly','quarterly','yearly')),
  add column if not exists recurring_until date;

create index if not exists idx_transactions_paid_by on transactions(paid_by_user_id);
create index if not exists idx_transactions_to_account on transactions(to_account_id);
create index if not exists idx_transactions_recurring on transactions(recurring_rule) where recurring_rule is not null;

alter table accounts
  add column if not exists is_private boolean not null default false;

create index if not exists idx_accounts_is_private on accounts(is_private);

-- Garante que transferência tenha conta de destino diferente da origem quando preenchida
alter table transactions
  drop constraint if exists transfer_accounts_differ;
alter table transactions
  add constraint transfer_accounts_differ
  check (to_account_id is null or to_account_id <> account_id);
