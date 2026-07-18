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
