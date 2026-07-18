-- =============================================================================
-- Migration: Módulo Imóveis (aluguel)
-- Descrição: Gestão de imóveis para aluguel + histórico de pagamentos mensais
-- =============================================================================

create table if not exists imoveis (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,

  apelido text not null,
  tipo text not null check (tipo in ('kitnet','apartamento','casa','comercial','terreno','outro')),
  endereco text,
  valor_imovel numeric(15,2),

  valor_aluguel numeric(15,2) not null check (valor_aluguel >= 0),
  dia_vencimento integer check (dia_vencimento between 1 and 31),
  taxa_admin_pct numeric(5,2) default 0 check (taxa_admin_pct >= 0 and taxa_admin_pct <= 100),

  inquilino_nome text,
  inquilino_telefone text,
  inquilino_observacoes text,

  contrato_inicio date,
  contrato_fim date,
  data_reajuste date,
  status text not null default 'alugado' check (status in ('alugado','vago','reforma')),

  created_by uuid not null references auth.users(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null,

  constraint imoveis_apelido_not_empty check (length(trim(apelido)) > 0)
);

create index if not exists imoveis_couple_id_idx on imoveis(couple_id);
create index if not exists imoveis_status_idx on imoveis(status) where deleted_at is null;

create table if not exists imovel_pagamentos (
  id uuid default gen_random_uuid() primary key,
  imovel_id uuid not null references imoveis(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,

  mes_referencia date not null,
  valor_bruto numeric(15,2) not null,
  valor_liquido numeric(15,2) not null,
  data_pagamento date,
  status text not null default 'pendente' check (status in ('pago','pendente','atrasado')),
  observacoes text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(imovel_id, mes_referencia)
);

create index if not exists imovel_pagamentos_imovel_id_idx on imovel_pagamentos(imovel_id);
create index if not exists imovel_pagamentos_couple_id_idx on imovel_pagamentos(couple_id);
create index if not exists imovel_pagamentos_mes_idx on imovel_pagamentos(mes_referencia);

-- RLS imoveis
alter table imoveis enable row level security;

create policy "imoveis_select" on imoveis for select using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "imoveis_insert" on imoveis for insert with check (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "imoveis_update" on imoveis for update using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "imoveis_delete" on imoveis for delete using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

-- RLS imovel_pagamentos
alter table imovel_pagamentos enable row level security;

create policy "imovel_pagamentos_select" on imovel_pagamentos for select using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "imovel_pagamentos_insert" on imovel_pagamentos for insert with check (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "imovel_pagamentos_update" on imovel_pagamentos for update using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

create policy "imovel_pagamentos_delete" on imovel_pagamentos for delete using (
  couple_id in (
    select id from couples where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
  )
);

-- Triggers updated_at
create or replace function set_imoveis_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists imoveis_set_updated_at on imoveis;
create trigger imoveis_set_updated_at
  before update on imoveis
  for each row execute function set_imoveis_updated_at();

drop trigger if exists imovel_pagamentos_set_updated_at on imovel_pagamentos;
create trigger imovel_pagamentos_set_updated_at
  before update on imovel_pagamentos
  for each row execute function set_imoveis_updated_at();
