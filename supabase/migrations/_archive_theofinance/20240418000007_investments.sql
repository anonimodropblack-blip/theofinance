-- ============================================================
-- Fase 4: Módulo Investimentos (CRUD + patrimônio consolidado)
-- ============================================================

create table if not exists investments (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  ticker text,
  asset_type text not null check (
    asset_type in ('renda_fixa', 'renda_variavel', 'cripto', 'outros')
  ),
  invested_amount numeric(15, 2) not null,
  current_amount numeric(15, 2) not null,
  source text,
  notes text,
  last_updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone default null,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint investments_name_not_empty check (length(trim(name)) > 0),
  constraint investments_invested_positive check (invested_amount >= 0),
  constraint investments_current_positive check (current_amount >= 0)
);

create index if not exists investments_couple_id_idx on investments(couple_id);
create index if not exists investments_type_idx on investments(asset_type);
create index if not exists investments_deleted_at_idx
  on investments(deleted_at) where deleted_at is null;

alter table investments enable row level security;

create policy "Users can view couple investments" on investments
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can insert couple investments" on investments
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can update couple investments" on investments
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple investments" on investments
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create or replace function set_investments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists investments_set_updated_at on investments;
create trigger investments_set_updated_at
  before update on investments
  for each row execute function set_investments_updated_at();
