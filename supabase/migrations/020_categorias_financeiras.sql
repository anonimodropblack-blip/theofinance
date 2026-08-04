-- ============================================================
-- Categorias financeiras (ícone + cor) — substitui o texto livre
-- de lancamentos_financeiros.categoria por um cadastro editável.
-- ============================================================

create table categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  icone text not null default 'Tag',
  cor text not null default 'neutral',
  ativo boolean not null default true,
  padrao boolean not null default false,
  created_at timestamptz not null default now()
);

alter table categorias_financeiras enable row level security;
create policy "authenticated_full_access" on categorias_financeiras for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into categorias_financeiras (nome, icone, cor, padrao) values
  ('Estoque', 'Package', 'blue', true),
  ('Fretes', 'Truck', 'amber', true),
  ('Marketing', 'Megaphone', 'violet', true),
  ('Pró-labore', 'Wallet', 'green', true),
  ('Energia', 'Zap', 'amber', true),
  ('Bancos', 'Landmark', 'neutral', true),
  ('Impostos', 'Receipt', 'red', true),
  ('Transferência', 'ArrowLeftRight', 'neutral', true),
  ('Retirada', 'ArrowDownToLine', 'neutral', true),
  ('Vendas', 'ShoppingCart', 'green', true),
  ('Caixinha', 'PiggyBank', 'violet', true),
  ('Outros', 'MoreHorizontal', 'neutral', true);

alter table lancamentos_financeiros add column categoria_id uuid references categorias_financeiras(id) on delete set null;

-- Cria uma categoria personalizada pra cada texto livre já usado que não bate (case-insensitive)
-- com nenhuma categoria existente.
insert into categorias_financeiras (nome, icone, cor, padrao)
select distinct trim(lf.categoria), 'Tag', 'neutral', false
from lancamentos_financeiros lf
where lf.categoria is not null and trim(lf.categoria) <> ''
  and not exists (
    select 1 from categorias_financeiras cf where lower(cf.nome) = lower(trim(lf.categoria))
  );

-- Vincula todo lançamento antigo à categoria correspondente (seeded ou recém-criada acima).
update lancamentos_financeiros lf
set categoria_id = cf.id
from categorias_financeiras cf
where lf.categoria_id is null
  and lf.categoria is not null and trim(lf.categoria) <> ''
  and lower(cf.nome) = lower(trim(lf.categoria));
