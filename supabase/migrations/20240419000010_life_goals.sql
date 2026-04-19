-- =============================================================================
-- Migration: Fase 9 — Planejamento Financeiro de Vida
-- Descrição: Metas de longo prazo (casa, carro, filhos, aposentadoria)
-- =============================================================================

create table if not exists life_goals (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  category text not null check (category in ('casa', 'carro', 'filhos', 'aposentadoria', 'viagem', 'outro')),
  name text not null,
  target_amount numeric(15, 2) not null check (target_amount > 0),
  current_amount numeric(15, 2) not null default 0,
  target_date date,
  expected_annual_return numeric(5, 2) default 6.00,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null,

  constraint life_goals_name_not_empty check (length(trim(name)) > 0)
);

create index if not exists life_goals_couple_id_idx on life_goals(couple_id);
create index if not exists life_goals_active_idx on life_goals(is_active) where deleted_at is null;

alter table life_goals enable row level security;

create policy "life_goals_select" on life_goals for select using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "life_goals_insert" on life_goals for insert with check (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "life_goals_update" on life_goals for update using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "life_goals_delete" on life_goals for delete using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create or replace function set_life_goals_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists life_goals_set_updated_at on life_goals;
create trigger life_goals_set_updated_at
  before update on life_goals
  for each row execute function set_life_goals_updated_at();
