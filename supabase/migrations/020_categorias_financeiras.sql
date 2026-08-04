-- ============================================================
-- Categorias financeiras (icone + cor) -- substitui o texto livre
-- de lancamentos_financeiros.categoria por um cadastro editavel.
-- Idempotente: seguro rodar de novo mesmo se uma tentativa anterior
-- tiver parado no meio.
-- Sem acentuacao de proposito (nomes e comentarios) -- copiar/colar
-- caracteres acentuados quebrou o editor SQL em tentativas anteriores.
-- ============================================================

create table if not exists categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  icone text not null default 'Tag',
  cor text not null default 'neutral',
  ativo boolean not null default true,
  padrao boolean not null default false,
  created_at timestamptz not null default now()
);

alter table categorias_financeiras enable row level security;

drop policy if exists "authenticated_full_access" on categorias_financeiras;
create policy "authenticated_full_access" on categorias_financeiras for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into categorias_financeiras (nome, icone, cor, padrao)
select v.nome, v.icone, v.cor, true
from (values
  ('Estoque', 'Package', 'blue'),
  ('Fretes', 'Truck', 'amber'),
  ('Marketing', 'Megaphone', 'violet'),
  ('Pro-labore', 'Wallet', 'green'),
  ('Energia', 'Zap', 'amber'),
  ('Bancos', 'Landmark', 'neutral'),
  ('Impostos', 'Receipt', 'red'),
  ('Transferencia', 'ArrowLeftRight', 'neutral'),
  ('Retirada', 'ArrowDownToLine', 'neutral'),
  ('Vendas', 'ShoppingCart', 'green'),
  ('Caixinha', 'PiggyBank', 'violet'),
  ('Outros', 'MoreHorizontal', 'neutral')
) as v(nome, icone, cor)
where not exists (select 1 from categorias_financeiras cf where lower(cf.nome) = lower(v.nome));

alter table lancamentos_financeiros add column if not exists categoria_id uuid references categorias_financeiras(id) on delete set null;

-- Cria uma categoria personalizada pra cada texto livre ja usado que nao bate (case-insensitive)
-- com nenhuma categoria existente.
insert into categorias_financeiras (nome, icone, cor, padrao)
select distinct trim(categoria), 'Tag', 'neutral', false
from lancamentos_financeiros
where categoria is not null
  and trim(categoria) <> ''
  and lower(trim(categoria)) not in (select lower(nome) from categorias_financeiras);

-- Vincula todo lancamento antigo a categoria correspondente (seeded ou recem-criada acima).
update lancamentos_financeiros lf
set categoria_id = cf.id
from categorias_financeiras cf
where lf.categoria_id is null
  and lf.categoria is not null and trim(lf.categoria) <> ''
  and lower(cf.nome) = lower(trim(lf.categoria));
