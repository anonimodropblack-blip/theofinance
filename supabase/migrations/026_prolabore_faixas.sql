-- Pro-labore vira faixa por saldo de caixa em vez de formula sobre o lucro do
-- mes: abaixo de cada saldo_minimo, libera o valor da faixa mais alta que o
-- saldo atual ainda cobre. Reavaliado sempre com o saldo de HOJE (operacional +
-- reserva somados) -- se o caixa cair, o pro-labore sugerido cai junto, porque
-- a saude da empresa vem antes do salario do dono. As colunas antigas de
-- pro-labore em "configuracoes" (piso/alvo/pct_excedente/descontar_custo_fixo)
-- ficam sem uso, mantidas so pra nao perder historico -- nao sao mais lidas
-- pelo app.
create table if not exists prolabore_faixas (
  id uuid primary key default gen_random_uuid(),
  saldo_minimo numeric(12,2) not null,
  valor numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique(saldo_minimo)
);

alter table prolabore_faixas enable row level security;
drop policy if exists "authenticated_full_access" on prolabore_faixas;
create policy "authenticated_full_access" on prolabore_faixas for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into prolabore_faixas (saldo_minimo, valor)
select * from (values (0, 1500), (25000, 3000)) as v(saldo_minimo, valor)
where not exists (select 1 from prolabore_faixas);
