-- ============================================================
-- Phase 7: Dívidas, Soft Delete e Audit Log
-- ============================================================

-- Debts table
create table if not exists debts (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  creditor text not null,
  total_amount numeric(15, 2) not null,
  remaining_amount numeric(15, 2) not null,
  installments_total integer not null default 1,
  installments_paid integer not null default 0,
  installment_value numeric(15, 2),
  due_day integer check (due_day >= 1 and due_day <= 31),
  status text not null default 'active' check (status in ('active', 'paid', 'negotiated')),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint name_not_empty check (length(trim(name)) > 0),
  constraint creditor_not_empty check (length(trim(creditor)) > 0),
  constraint total_amount_positive check (total_amount > 0),
  constraint remaining_not_negative check (remaining_amount >= 0),
  constraint installments_total_positive check (installments_total >= 1),
  constraint installments_paid_valid check (installments_paid >= 0 and installments_paid <= installments_total)
);

create index if not exists debts_couple_id_idx on debts(couple_id);
create index if not exists debts_status_idx on debts(status);

-- Soft delete: add deleted_at to main tables
alter table transactions add column if not exists deleted_at timestamp with time zone default null;
alter table accounts add column if not exists deleted_at timestamp with time zone default null;
alter table fixed_accounts add column if not exists deleted_at timestamp with time zone default null;
alter table savings_goals add column if not exists deleted_at timestamp with time zone default null;
alter table due_bills add column if not exists deleted_at timestamp with time zone default null;

create index if not exists transactions_deleted_at_idx on transactions(deleted_at) where deleted_at is null;
create index if not exists accounts_deleted_at_idx on accounts(deleted_at) where deleted_at is null;
create index if not exists fixed_accounts_deleted_at_idx on fixed_accounts(deleted_at) where deleted_at is null;
create index if not exists savings_goals_deleted_at_idx on savings_goals(deleted_at) where deleted_at is null;
create index if not exists due_bills_deleted_at_idx on due_bills(deleted_at) where deleted_at is null;

-- Audit log table
create table if not exists audit_log (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null check (action in ('create', 'update', 'delete', 'restore')),
  entity_type text not null,
  entity_id uuid not null,
  entity_name text,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now() not null
);

create index if not exists audit_log_couple_id_idx on audit_log(couple_id);
create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id);
create index if not exists audit_log_created_at_idx on audit_log(created_at desc);

-- RLS: Debts
alter table debts enable row level security;

create policy "Users can view couple debts" on debts
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can insert couple debts" on debts
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can update couple debts" on debts
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple debts" on debts
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Audit Log
alter table audit_log enable row level security;

create policy "Users can view couple audit log" on audit_log
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can insert audit log" on audit_log
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );
