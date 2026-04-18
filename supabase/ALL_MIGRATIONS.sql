-- ========================================
-- 001_phase1_auth_couple.sql
-- ========================================
-- =============================================================================
-- Migration: 001_phase1_auth_couple.sql
-- Phase: 01 - Auth e Casal
-- Description: Schema completo para auth e casal como unidade de tenancy.
--              RLS ativado em todas as tabelas desde a criação.
--              Funções SECURITY DEFINER para operações privilegiadas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela couples (tenant unit — unidade de tenancy do sistema)
-- -----------------------------------------------------------------------------
CREATE TABLE public.couples (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Tabela profiles (extende auth.users com dados do domínio)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id    UUID        REFERENCES public.couples(id),
  email        TEXT,
  display_name TEXT,
  view_mode    TEXT        DEFAULT 'couple' CHECK (view_mode IN ('individual', 'couple')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Tabela couple_members (join table — um usuário pertence a APENAS um casal)
-- -----------------------------------------------------------------------------
CREATE TABLE public.couple_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  UUID        NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. Tabela couple_invites (convites de parceiro com token único)
-- -----------------------------------------------------------------------------
CREATE TABLE public.couple_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   UUID        NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  invited_by  UUID        NOT NULL REFERENCES auth.users(id),
  email       TEXT        NOT NULL,
  token       UUID        NOT NULL DEFAULT gen_random_uuid(),
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couple_invites ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. Índices de performance obrigatórios
-- -----------------------------------------------------------------------------
CREATE INDEX idx_couple_members_user_id   ON public.couple_members(user_id);
CREATE INDEX idx_couple_members_couple_id ON public.couple_members(couple_id);
CREATE INDEX idx_profiles_couple_id       ON public.profiles(couple_id);
CREATE INDEX idx_couple_invites_token     ON public.couple_invites(token);

-- -----------------------------------------------------------------------------
-- 6. Função helper para RLS — SECURITY DEFINER com search_path fixo
--    Base de todas as policies de isolamento por casal
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_couple_id_for_user(uid UUID)
RETURNS UUID AS $$
  SELECT couple_id
  FROM public.couple_members
  WHERE user_id = uid
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- 7. RLS Policies
-- -----------------------------------------------------------------------------

-- Couples: membros veem apenas o próprio casal
CREATE POLICY "members_see_own_couple" ON public.couples
  FOR SELECT TO authenticated
  USING (id = public.get_couple_id_for_user(auth.uid()));

-- Profiles: usuário vê perfis do próprio casal
CREATE POLICY "couple_members_see_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

-- Profiles: usuário edita apenas o próprio perfil
CREATE POLICY "user_updates_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles: usuário insere apenas o próprio perfil
CREATE POLICY "user_inserts_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Couple_members: membros veem membros do próprio casal
CREATE POLICY "members_see_couple_members" ON public.couple_members
  FOR SELECT TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

-- Couple_invites: membros criam e gerenciam convites do próprio casal
CREATE POLICY "members_manage_invites" ON public.couple_invites
  FOR ALL TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

-- -----------------------------------------------------------------------------
-- 8. Função SECURITY DEFINER para leitura de convite por usuário não autenticado
--    Necessária para exibir "Você foi convidado por X" antes do login
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token UUID)
RETURNS SETOF public.couple_invites
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT *
  FROM public.couple_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();
$$;

-- -----------------------------------------------------------------------------
-- 9. RPC atômica para aceitar convite (evita race condition e dupla aceitação)
--    Usa FOR UPDATE lock para serializar acesso concorrente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_couple_invite(
  p_token   UUID,
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.couple_invites%ROWTYPE;
BEGIN
  -- Lock o convite para evitar dupla aceitação concorrente
  SELECT * INTO v_invite
  FROM public.couple_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  -- Verificar que o usuário não está em outro casal
  IF EXISTS (SELECT 1 FROM public.couple_members WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário já pertence a um casal';
  END IF;

  -- Entrar no casal como membro
  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_invite.couple_id, p_user_id, 'member');

  -- Atualizar couple_id no profile do novo membro
  UPDATE public.profiles
  SET couple_id = v_invite.couple_id
  WHERE id = p_user_id;

  -- Marcar convite como aceito
  UPDATE public.couple_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10. Trigger para criar casal automaticamente no signup
--     Nunca depender do cliente para criar o casal — DB trigger é atômico
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_couple_id UUID;
BEGIN
  -- Cria o casal do novo usuário
  INSERT INTO public.couples (name)
  VALUES ('Meu Casal')
  RETURNING id INTO new_couple_id;

  -- Cria o profile vinculado ao casal
  INSERT INTO public.profiles (id, couple_id, email)
  VALUES (NEW.id, new_couple_id, NEW.email);

  -- Registra o usuário como owner do casal
  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (new_couple_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ========================================
-- 20240416000000_add_invites.sql
-- ========================================
-- Create couple_invites table
create table if not exists couple_invites (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  invited_email text not null,
  token text not null unique,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,

  constraint email_format check (invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
create index idx_couple_invites_couple_id on couple_invites(couple_id);
create index idx_couple_invites_token on couple_invites(token);
create index idx_couple_invites_email on couple_invites(invited_email);

-- RLS
alter table couple_invites enable row level security;

-- Policy: Users can see invites for their couple
create policy "Users can view couple invites" on couple_invites
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- Policy: Primary user can create invites
create policy "Primary user can create invites" on couple_invites
  for insert
  with check (
    couple_id in (
      select id from couples where primary_user_id = auth.uid()
    )
  );

-- Policy: Allow anon to verify token (for accept-invite flow)
create policy "Anon can verify invite tokens" on couple_invites
  for select
  using (
    -- If user is anonymous, allow checking token validity
    auth.role() = 'anon'
  );


-- ========================================
-- 20240416000001_accounts_and_transactions.sql
-- ========================================
-- Accounts table
create table if not exists accounts (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit', 'cash')),
  balance numeric(15, 2) default 0,
  currency text default 'BRL',
  color text default '#3b82f6',
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint positive_balance check (type != 'credit' or balance >= 0),
  constraint name_not_empty check (length(trim(name)) > 0)
);

-- Account members (who has access)
create table if not exists account_members (
  id uuid default gen_random_uuid() primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text default 'view' check (permission in ('view', 'edit', 'admin')),
  added_at timestamp with time zone default now() not null,

  unique(account_id, user_id)
);

-- Categories table
create table if not exists transaction_categories (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text default '#6b7280',
  icon text default '📌',
  created_at timestamp with time zone default now() not null,

  unique(couple_id, name, type)
);

-- Transactions table
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  category_id uuid references transaction_categories(id) on delete set null,
  amount numeric(15, 2) not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  description text,
  date date not null default current_date,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint amount_positive check (amount > 0),
  constraint description_not_empty check (description is null or length(trim(description)) > 0)
);

-- Indexes
create index idx_accounts_couple_id on accounts(couple_id);
create index idx_accounts_created_by on accounts(created_by);
create index idx_account_members_user_id on account_members(user_id);
create index idx_transactions_couple_id on transactions(couple_id);
create index idx_transactions_account_id on transactions(account_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_created_by on transactions(created_by);
create index idx_categories_couple_id on transaction_categories(couple_id);

-- RLS: Accounts
alter table accounts enable row level security;

create policy "Users can view couple accounts" on accounts
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create accounts for couple" on accounts
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple accounts" on accounts
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Account Members
alter table account_members enable row level security;

create policy "Users can view account members of their accounts" on account_members
  for select
  using (
    account_id in (
      select id from accounts
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

-- RLS: Categories
alter table transaction_categories enable row level security;

create policy "Users can view couple categories" on transaction_categories
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create categories for couple" on transaction_categories
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Transactions
alter table transactions enable row level security;

create policy "Users can view couple transactions" on transactions
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create transactions for couple" on transactions
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple transactions" on transactions
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );


-- ========================================
-- 20240416000002_dashboard_favorites_cache.sql
-- ========================================
-- Favorites table (accounts marked as favorite)
create table if not exists account_favorites (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamp with time zone default now() not null,

  unique(couple_id, account_id, user_id)
);

-- Dashboard summary cache (pre-calculated for performance)
create table if not exists dashboard_summaries (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  period text not null, -- 'current_month', 'last_30_days', etc
  total_income numeric(15, 2) default 0,
  total_expense numeric(15, 2) default 0,
  net_balance numeric(15, 2) default 0,
  transaction_count integer default 0,
  accounts_count integer default 0,
  total_accounts_balance numeric(15, 2) default 0,
  calculated_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone default now() + interval '1 hour',

  unique(couple_id, period)
);

-- Quick stats for alerts
create table if not exists account_alerts (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  alert_type text not null check (alert_type in ('low_balance', 'high_expense', 'unusual_activity')),
  threshold numeric(15, 2),
  is_active boolean default true,
  created_at timestamp with time zone default now() not null,

  unique(couple_id, account_id, alert_type)
);

-- Indexes
create index idx_favorites_couple_id on account_favorites(couple_id);
create index idx_favorites_user_id on account_favorites(user_id);
create index idx_summaries_couple_id on dashboard_summaries(couple_id);
create index idx_summaries_expires on dashboard_summaries(expires_at);
create index idx_alerts_couple_id on account_alerts(couple_id);
create index idx_alerts_active on account_alerts(is_active);

-- RLS: Favorites
alter table account_favorites enable row level security;

create policy "Users can view couple favorites" on account_favorites
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can add favorites for themselves" on account_favorites
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = user_id
  );

create policy "Users can remove their own favorites" on account_favorites
  for delete
  using (
    auth.uid() = user_id
  );

-- RLS: Dashboard Summaries
alter table dashboard_summaries enable row level security;

create policy "Users can view couple summaries" on dashboard_summaries
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- Service role only for cache updates (via trigger or API)
create policy "Service role updates summaries" on dashboard_summaries
  for insert
  with check (auth.role() = 'service_role');

create policy "Service role updates summaries patch" on dashboard_summaries
  for update
  with check (auth.role() = 'service_role');

-- RLS: Alerts
alter table account_alerts enable row level security;

create policy "Users can view couple alerts" on account_alerts
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can manage couple alerts" on account_alerts
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can update couple alerts" on account_alerts
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );


-- ========================================
-- 20240416000003_fixed_accounts_and_savings_goals.sql
-- ========================================
-- Fixed Accounts table (contas fixas mensal/bimensal/etc)
create table if not exists fixed_accounts (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  amount numeric(15, 2) not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly')),
  due_date integer check (due_date >= 1 and due_date <= 31),
  category text,
  description text,
  is_active boolean default true,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint amount_positive check (amount > 0),
  constraint name_not_empty check (length(trim(name)) > 0),
  constraint description_not_empty check (description is null or length(trim(description)) > 0)
);

-- Savings Goals table (caixinhas / metas)
create table if not exists savings_goals (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  target_amount numeric(15, 2) not null,
  current_amount numeric(15, 2) default 0,
  icon text default '🎯',
  color text default '#ec4899',
  deadline date,
  is_active boolean default true,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint target_positive check (target_amount > 0),
  constraint current_non_negative check (current_amount >= 0),
  constraint name_not_empty check (length(trim(name)) > 0),
  constraint current_lte_target check (current_amount <= target_amount)
);

-- Savings contributions (transações para caixinhas)
create table if not exists savings_contributions (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid not null references savings_goals(id) on delete cascade,
  amount numeric(15, 2) not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,

  constraint amount_positive check (amount > 0),
  constraint description_not_empty check (description is null or length(trim(description)) > 0)
);

-- Indexes
create index idx_fixed_accounts_couple_id on fixed_accounts(couple_id);
create index idx_fixed_accounts_created_by on fixed_accounts(created_by);
create index idx_fixed_accounts_is_active on fixed_accounts(is_active);
create index idx_savings_goals_couple_id on savings_goals(couple_id);
create index idx_savings_goals_created_by on savings_goals(created_by);
create index idx_savings_goals_is_active on savings_goals(is_active);
create index idx_savings_contributions_goal_id on savings_contributions(goal_id);
create index idx_savings_contributions_created_by on savings_contributions(created_by);

-- RLS: Fixed Accounts
alter table fixed_accounts enable row level security;

create policy "Users can view couple fixed accounts" on fixed_accounts
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create fixed accounts for couple" on fixed_accounts
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple fixed accounts" on fixed_accounts
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple fixed accounts" on fixed_accounts
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Savings Goals
alter table savings_goals enable row level security;

create policy "Users can view couple savings goals" on savings_goals
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create savings goals for couple" on savings_goals
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple savings goals" on savings_goals
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple savings goals" on savings_goals
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Savings Contributions
alter table savings_contributions enable row level security;

create policy "Users can view contributions for couple goals" on savings_contributions
  for select
  using (
    goal_id in (
      select id from savings_goals
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

create policy "Users can add contributions to couple goals" on savings_contributions
  for insert
  with check (
    goal_id in (
      select id from savings_goals
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
    and auth.uid() = created_by
  );

create policy "Users can delete their contributions" on savings_contributions
  for delete
  using (
    auth.uid() = created_by
  );


-- ========================================
-- 20240416000004_due_bills_and_reminders.sql
-- ========================================
-- Due Bills table (contas a vencer / contas a pagar)
create table if not exists due_bills (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  title text not null,
  amount numeric(15, 2) not null,
  due_date date not null,
  status text not null check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  category text,
  description text,
  reminder_days integer default 0,
  reminder_sent boolean default false,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  paid_at timestamp with time zone,

  constraint amount_positive check (amount > 0),
  constraint title_not_empty check (length(trim(title)) > 0),
  constraint reminder_days_valid check (reminder_days >= 0)
);

-- Reminders table (histórico de lembretes enviados)
create table if not exists reminders (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid not null references due_bills(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('email', 'sms', 'push', 'in_app')),
  sent_at timestamp with time zone not null default now(),
  status text default 'sent' check (status in ('sent', 'failed', 'read')),

  unique(bill_id, reminder_type, date_trunc('day', sent_at))
);

-- Bill payments table (histórico de pagamentos)
create table if not exists bill_payments (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid not null references due_bills(id) on delete cascade,
  amount_paid numeric(15, 2) not null,
  paid_date date not null,
  payment_method text,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,

  constraint amount_positive check (amount_paid > 0)
);

-- Indexes
create index idx_due_bills_couple_id on due_bills(couple_id);
create index idx_due_bills_created_by on due_bills(created_by);
create index idx_due_bills_due_date on due_bills(due_date);
create index idx_due_bills_status on due_bills(status);
create index idx_reminders_bill_id on reminders(bill_id);
create index idx_reminders_sent_at on reminders(sent_at);
create index idx_bill_payments_bill_id on bill_payments(bill_id);

-- RLS: Due Bills
alter table due_bills enable row level security;

create policy "Users can view couple due bills" on due_bills
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create due bills for couple" on due_bills
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple due bills" on due_bills
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple due bills" on due_bills
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Reminders
alter table reminders enable row level security;

create policy "Users can view couple reminders" on reminders
  for select
  using (
    bill_id in (
      select id from due_bills
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

-- RLS: Bill Payments
alter table bill_payments enable row level security;

create policy "Users can view couple bill payments" on bill_payments
  for select
  using (
    bill_id in (
      select id from due_bills
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

create policy "Users can add bill payments for couple" on bill_payments
  for insert
  with check (
    bill_id in (
      select id from due_bills
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
    and auth.uid() = created_by
  );


-- ========================================
-- 20240417000005_chat_conversations_and_messages.sql
-- ========================================
-- Conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  title text not null,
  topic text check (topic in ('spending_analysis', 'savings_tips', 'budget_planning', 'investment_advice', 'general')),
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  archived boolean default false,

  constraint title_not_empty check (length(trim(title)) > 0)
);

-- Messages table (conversation history)
create table if not exists conversation_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens_used integer,
  created_at timestamp with time zone default now() not null,

  constraint content_not_empty check (length(trim(content)) > 0)
);

-- Conversation insights (cached AI responses)
create table if not exists conversation_insights (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  insight_type text not null check (insight_type in ('spending_pattern', 'savings_opportunity', 'budget_recommendation', 'alert')),
  title text not null,
  description text not null,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  data jsonb,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone,

  constraint title_not_empty check (length(trim(title)) > 0),
  constraint description_not_empty check (length(trim(description)) > 0)
);

-- Indexes
create index idx_conversations_couple_id on conversations(couple_id);
create index idx_conversations_created_by on conversations(created_by);
create index idx_conversations_archived on conversations(archived);
create index idx_messages_conversation_id on conversation_messages(conversation_id);
create index idx_messages_created_at on conversation_messages(created_at);
create index idx_insights_couple_id on conversation_insights(couple_id);
create index idx_insights_type on conversation_insights(insight_type);

-- RLS: Conversations
alter table conversations enable row level security;

create policy "Users can view couple conversations" on conversations
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create conversations for couple" on conversations
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple conversations" on conversations
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Messages
alter table conversation_messages enable row level security;

create policy "Users can view couple messages" on conversation_messages
  for select
  using (
    conversation_id in (
      select id from conversations
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

create policy "Users can add messages to couple conversations" on conversation_messages
  for insert
  with check (
    conversation_id in (
      select id from conversations
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

-- RLS: Insights
alter table conversation_insights enable row level security;

create policy "Users can view couple insights" on conversation_insights
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple insights" on conversation_insights
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );


-- ========================================
-- 20240417000006_debts_softdelete_auditlog.sql
-- ========================================
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


