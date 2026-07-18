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
