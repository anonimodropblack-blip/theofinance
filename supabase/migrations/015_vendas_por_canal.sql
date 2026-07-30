-- Vendas por canal: substitui produtos.vendas_mes (scalar único) por uma linha por
-- produto x marketplace, mesmo padrão de `estoque` (produto x local). Cada marketplace
-- tem comissão diferente, então o lucro real depende de saber QUANTO vende em CADA
-- canal, não só o total.
create table vendas_mes_canal (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  local_id uuid not null references locais_estoque(id) on delete cascade,
  quantidade int not null default 0 check (quantidade >= 0),
  unique (produto_id, local_id)
);

alter table vendas_mes_canal enable row level security;
create policy "authenticated_full_access" on vendas_mes_canal for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Seed: migra os dados existentes pro canal "padrão" atual, usando o MESMO critério já
-- usado no código (src/app/dashboard/page.tsx: locais.find(usa_tarifa_fba) ?? locais.find(tipo='marketplace')).
do $$
declare
  canal_padrao_id uuid;
begin
  select id into canal_padrao_id from locais_estoque where usa_tarifa_fba = true order by ordem limit 1;
  if canal_padrao_id is null then
    select id into canal_padrao_id from locais_estoque where tipo = 'marketplace' order by ordem limit 1;
  end if;

  if canal_padrao_id is not null then
    insert into vendas_mes_canal (produto_id, local_id, quantidade)
    select id, canal_padrao_id, vendas_mes
    from produtos
    where vendas_mes is not null and vendas_mes > 0;
  end if;
end $$;

-- Destrutivo: dropa a coluna scalar depois de copiar os dados pro canal padrão acima.
alter table produtos drop column vendas_mes;
