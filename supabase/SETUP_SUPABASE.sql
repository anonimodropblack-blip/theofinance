-- =============================================================================
-- TheoFinance — Setup SUPABASE consolidado
-- Roda uma única vez num projeto Supabase novo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela couples (tenant unit)
-- -----------------------------------------------------------------------------
create table if not exists couples (
  id                    uuid primary key default gen_random_uuid(),
  primary_user_id       uuid not null references auth.users(id) on delete cascade,
  primary_user_email    text not null,
  secondary_user_id     uuid references auth.users(id) on delete set null,
  secondary_user_email  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_couples_primary_user on couples(primary_user_id);
create index if not exists idx_couples_secondary_user on couples(secondary_user_id);

alter table couples enable row level security;

create policy "Users see own couple" on couples
  for select
  using (primary_user_id = auth.uid() or secondary_user_id = auth.uid());

create policy "Users update own couple" on couples
  for update
  using (primary_user_id = auth.uid() or secondary_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. Tabela couple_invites
-- -----------------------------------------------------------------------------
create table if not exists couple_invites (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references couples(id) on delete cascade,
  invited_email  text not null,
  token          text not null unique,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  constraint email_format check (invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

create index if not exists idx_invites_couple_id on couple_invites(couple_id);
create index if not exists idx_invites_token on couple_invites(token);
create index if not exists idx_invites_email on couple_invites(invited_email);

alter table couple_invites enable row level security;

create policy "Users view couple invites" on couple_invites
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Primary user creates invites" on couple_invites
  for insert
  with check (
    couple_id in (select id from couples where primary_user_id = auth.uid())
  );

create policy "Anon verifies invite tokens" on couple_invites
  for select
  using (auth.role() = 'anon');

-- -----------------------------------------------------------------------------
-- 3. Accounts + members + categories + transactions
-- -----------------------------------------------------------------------------
create table if not exists accounts (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('checking','savings','credit','cash')),
  balance     numeric(15,2) default 0,
  currency    text default 'BRL',
  color       text default '#3b82f6',
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint name_not_empty check (length(trim(name)) > 0),
  constraint positive_balance check (type != 'credit' or balance >= 0)
);

create table if not exists account_members (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  permission  text default 'view' check (permission in ('view','edit','admin')),
  added_at    timestamptz not null default now(),
  unique(account_id, user_id)
);

create table if not exists transaction_categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('income','expense')),
  color      text default '#6b7280',
  icon       text default '📌',
  created_at timestamptz not null default now(),
  unique(couple_id, name, type)
);

create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade,
  account_id   uuid not null references accounts(id) on delete cascade,
  category_id  uuid references transaction_categories(id) on delete set null,
  amount       numeric(15,2) not null,
  type         text not null check (type in ('income','expense','transfer')),
  description  text,
  date         date not null default current_date,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint amount_positive check (amount > 0)
);

create index if not exists idx_accounts_couple on accounts(couple_id);
create index if not exists idx_accounts_deleted on accounts(deleted_at) where deleted_at is null;
create index if not exists idx_account_members_user on account_members(user_id);
create index if not exists idx_categories_couple on transaction_categories(couple_id);
create index if not exists idx_transactions_couple on transactions(couple_id);
create index if not exists idx_transactions_account on transactions(account_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_deleted on transactions(deleted_at) where deleted_at is null;

alter table accounts enable row level security;
alter table account_members enable row level security;
alter table transaction_categories enable row level security;
alter table transactions enable row level security;

create policy "couple_accounts_select" on accounts for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "couple_accounts_insert" on accounts for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and auth.uid() = created_by);
create policy "couple_accounts_update" on accounts for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "couple_accounts_delete" on accounts for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "account_members_select" on account_members for select
  using (account_id in (select id from accounts where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())));

create policy "categories_select" on transaction_categories for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "categories_insert" on transaction_categories for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "tx_select" on transactions for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "tx_insert" on transactions for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and auth.uid() = created_by);
create policy "tx_update" on transactions for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "tx_delete" on transactions for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 4. Favorites + Dashboard cache + Alerts
-- -----------------------------------------------------------------------------
create table if not exists account_favorites (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  added_at    timestamptz not null default now(),
  unique(couple_id, account_id, user_id)
);

create table if not exists dashboard_summaries (
  id                     uuid primary key default gen_random_uuid(),
  couple_id              uuid not null references couples(id) on delete cascade,
  period                 text not null,
  total_income           numeric(15,2) default 0,
  total_expense          numeric(15,2) default 0,
  net_balance            numeric(15,2) default 0,
  transaction_count      integer default 0,
  accounts_count         integer default 0,
  total_accounts_balance numeric(15,2) default 0,
  calculated_at          timestamptz not null default now(),
  expires_at             timestamptz default now() + interval '1 hour',
  unique(couple_id, period)
);

create table if not exists account_alerts (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  alert_type  text not null check (alert_type in ('low_balance','high_expense','unusual_activity')),
  threshold   numeric(15,2),
  is_active   boolean default true,
  created_at  timestamptz not null default now(),
  unique(couple_id, account_id, alert_type)
);

alter table account_favorites enable row level security;
alter table dashboard_summaries enable row level security;
alter table account_alerts enable row level security;

create policy "favs_select" on account_favorites for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "favs_insert" on account_favorites for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and user_id = auth.uid());
create policy "favs_delete" on account_favorites for delete using (user_id = auth.uid());

create policy "summ_select" on dashboard_summaries for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "summ_insert_svc" on dashboard_summaries for insert with check (auth.role() = 'service_role');
create policy "summ_update_svc" on dashboard_summaries for update with check (auth.role() = 'service_role');

create policy "alerts_select" on account_alerts for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "alerts_insert" on account_alerts for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "alerts_update" on account_alerts for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Fixed accounts + Savings goals + Contributions
-- -----------------------------------------------------------------------------
create table if not exists fixed_accounts (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  name        text not null,
  amount      numeric(15,2) not null,
  frequency   text not null check (frequency in ('weekly','biweekly','monthly','bimonthly','quarterly','yearly')),
  due_date    integer check (due_date between 1 and 31),
  category    text,
  description text,
  is_active   boolean default true,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint amount_positive check (amount > 0),
  constraint name_not_empty check (length(trim(name)) > 0)
);

create table if not exists savings_goals (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade,
  name            text not null,
  target_amount   numeric(15,2) not null,
  current_amount  numeric(15,2) default 0,
  icon            text default '🎯',
  color           text default '#ec4899',
  deadline        date,
  is_active       boolean default true,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint target_positive check (target_amount > 0),
  constraint current_non_negative check (current_amount >= 0),
  constraint name_not_empty check (length(trim(name)) > 0),
  constraint current_lte_target check (current_amount <= target_amount)
);

create table if not exists savings_contributions (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references savings_goals(id) on delete cascade,
  amount      numeric(15,2) not null,
  description text,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  constraint amount_positive check (amount > 0)
);

create index if not exists idx_fixed_couple on fixed_accounts(couple_id);
create index if not exists idx_fixed_active on fixed_accounts(is_active);
create index if not exists idx_fixed_deleted on fixed_accounts(deleted_at) where deleted_at is null;
create index if not exists idx_goals_couple on savings_goals(couple_id);
create index if not exists idx_goals_active on savings_goals(is_active);
create index if not exists idx_goals_deleted on savings_goals(deleted_at) where deleted_at is null;
create index if not exists idx_contribs_goal on savings_contributions(goal_id);

alter table fixed_accounts enable row level security;
alter table savings_goals enable row level security;
alter table savings_contributions enable row level security;

create policy "fixed_select" on fixed_accounts for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "fixed_insert" on fixed_accounts for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and auth.uid() = created_by);
create policy "fixed_update" on fixed_accounts for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "fixed_delete" on fixed_accounts for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "goals_select" on savings_goals for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "goals_insert" on savings_goals for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and auth.uid() = created_by);
create policy "goals_update" on savings_goals for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "goals_delete" on savings_goals for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "contribs_select" on savings_contributions for select
  using (goal_id in (select id from savings_goals where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())));
create policy "contribs_insert" on savings_contributions for insert
  with check (goal_id in (select id from savings_goals where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())) and auth.uid() = created_by);
create policy "contribs_delete" on savings_contributions for delete using (auth.uid() = created_by);

-- -----------------------------------------------------------------------------
-- 6. Due bills + Reminders + Bill payments
-- -----------------------------------------------------------------------------
create table if not exists due_bills (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references couples(id) on delete cascade,
  title          text not null,
  amount         numeric(15,2) not null,
  due_date       date not null,
  status         text not null check (status in ('pending','paid','overdue','cancelled')),
  category       text,
  description    text,
  reminder_days  integer default 0 check (reminder_days >= 0),
  reminder_sent  boolean default false,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  paid_at        timestamptz,
  deleted_at     timestamptz,
  constraint amount_positive check (amount > 0),
  constraint title_not_empty check (length(trim(title)) > 0)
);

create table if not exists reminders (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references due_bills(id) on delete cascade,
  reminder_type  text not null check (reminder_type in ('email','sms','push','in_app')),
  sent_at        timestamptz not null default now(),
  sent_date      date not null default current_date,
  status         text default 'sent' check (status in ('sent','failed','read'))
);

create unique index if not exists reminders_unique_per_day
  on reminders (bill_id, reminder_type, sent_date);

create table if not exists bill_payments (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references due_bills(id) on delete cascade,
  amount_paid    numeric(15,2) not null,
  paid_date      date not null,
  payment_method text,
  notes          text,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  constraint amount_positive check (amount_paid > 0)
);

create index if not exists idx_bills_couple on due_bills(couple_id);
create index if not exists idx_bills_due on due_bills(due_date);
create index if not exists idx_bills_status on due_bills(status);
create index if not exists idx_bills_deleted on due_bills(deleted_at) where deleted_at is null;
create index if not exists idx_reminders_bill on reminders(bill_id);
create index if not exists idx_payments_bill on bill_payments(bill_id);

alter table due_bills enable row level security;
alter table reminders enable row level security;
alter table bill_payments enable row level security;

create policy "bills_select" on due_bills for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "bills_insert" on due_bills for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and auth.uid() = created_by);
create policy "bills_update" on due_bills for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "bills_delete" on due_bills for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "reminders_select" on reminders for select
  using (bill_id in (select id from due_bills where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())));

create policy "payments_select" on bill_payments for select
  using (bill_id in (select id from due_bills where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())));
create policy "payments_insert" on bill_payments for insert
  with check (bill_id in (select id from due_bills where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())) and auth.uid() = created_by);

-- -----------------------------------------------------------------------------
-- 7. Chat: conversations + messages + insights
-- -----------------------------------------------------------------------------
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  title       text not null,
  topic       text check (topic in ('spending_analysis','savings_tips','budget_planning','investment_advice','general')),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived    boolean default false,
  constraint title_not_empty check (length(trim(title)) > 0)
);

create table if not exists conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  tokens_used     integer,
  created_at      timestamptz not null default now(),
  constraint content_not_empty check (length(trim(content)) > 0)
);

create table if not exists conversation_insights (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade,
  insight_type text not null check (insight_type in ('spending_pattern','savings_opportunity','budget_recommendation','alert')),
  title        text not null,
  description  text not null,
  priority     text default 'medium' check (priority in ('low','medium','high','critical')),
  data         jsonb,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz
);

create index if not exists idx_conv_couple on conversations(couple_id);
create index if not exists idx_conv_archived on conversations(archived);
create index if not exists idx_msgs_conv on conversation_messages(conversation_id);
create index if not exists idx_msgs_created on conversation_messages(created_at);
create index if not exists idx_insights_couple on conversation_insights(couple_id);

alter table conversations enable row level security;
alter table conversation_messages enable row level security;
alter table conversation_insights enable row level security;

create policy "conv_select" on conversations for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "conv_insert" on conversations for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()) and auth.uid() = created_by);
create policy "conv_update" on conversations for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "msgs_select" on conversation_messages for select
  using (conversation_id in (select id from conversations where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())));
create policy "msgs_insert" on conversation_messages for insert
  with check (conversation_id in (select id from conversations where couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid())));

create policy "insights_select" on conversation_insights for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "insights_delete" on conversation_insights for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 8. Debts + Audit log (Phase 7)
-- -----------------------------------------------------------------------------
create table if not exists debts (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references couples(id) on delete cascade,
  name                text not null,
  creditor            text not null,
  total_amount        numeric(15,2) not null,
  remaining_amount    numeric(15,2) not null,
  installments_total  integer not null default 1,
  installments_paid   integer not null default 0,
  installment_value   numeric(15,2),
  due_day             integer check (due_day between 1 and 31),
  status              text not null default 'active' check (status in ('active','paid','negotiated')),
  notes               text,
  created_by          uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint name_not_empty check (length(trim(name)) > 0),
  constraint creditor_not_empty check (length(trim(creditor)) > 0),
  constraint total_positive check (total_amount > 0),
  constraint remaining_ok check (remaining_amount >= 0),
  constraint installments_positive check (installments_total >= 1),
  constraint installments_valid check (installments_paid >= 0 and installments_paid <= installments_total)
);

create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  action       text not null check (action in ('create','update','delete','restore')),
  entity_type  text not null,
  entity_id    uuid not null,
  entity_name  text,
  metadata     jsonb default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists idx_debts_couple on debts(couple_id);
create index if not exists idx_debts_status on debts(status);
create index if not exists idx_audit_couple on audit_log(couple_id);
create index if not exists idx_audit_entity on audit_log(entity_type, entity_id);
create index if not exists idx_audit_created on audit_log(created_at desc);

alter table debts enable row level security;
alter table audit_log enable row level security;

create policy "debts_select" on debts for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "debts_insert" on debts for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "debts_update" on debts for update
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "debts_delete" on debts for delete
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

create policy "audit_select" on audit_log for select
  using (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));
create policy "audit_insert" on audit_log for insert
  with check (couple_id in (select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()));

-- =============================================================================
-- FIM DO SETUP
-- =============================================================================
