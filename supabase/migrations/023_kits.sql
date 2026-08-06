-- Kits: produtos virtuais compostos por produtos ja cadastrados (ex: "Kit Imunidade" =
-- 2x Vitamina D3+K2 + 1x Vitamina B12). Custo, peso e estoque disponivel do kit sao
-- derivados dos componentes em tempo real no app (src/lib/kits.ts) -- nao ha coluna de
-- custo/estoque proprio pro kit, evita duplicar cadastro e ficar desatualizado.
alter table produtos add column if not exists eh_kit boolean not null default false;

create table if not exists kit_componentes (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references produtos(id) on delete cascade,
  componente_id uuid not null references produtos(id) on delete restrict,
  quantidade int not null check (quantidade > 0),
  created_at timestamptz not null default now(),
  unique(kit_id, componente_id)
);

alter table kit_componentes enable row level security;
drop policy if exists "authenticated_full_access" on kit_componentes;
create policy "authenticated_full_access" on kit_componentes for all using (auth.uid() is not null) with check (auth.uid() is not null);
