-- Tabela de Fabricantes: hoje produtos.fabricante é texto livre, isso guarda os dados de contato
-- de cada fabricante à parte. O campo em produtos continua texto (sem FK) — o autocomplete na
-- tela de Produtos sugere os fabricantes já cadastrados aqui e cria um novo automaticamente
-- quando o nome digitado ainda não existe.

create table fabricantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  telefone text,
  whatsapp text,
  email text,
  site text,
  endereco text,
  contato_responsavel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fabricantes enable row level security;
create policy "authenticated_full_access" on fabricantes for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- pré-popula com os fabricantes já usados nos produtos existentes
insert into fabricantes (nome)
select distinct trim(fabricante) from produtos
where fabricante is not null and trim(fabricante) <> ''
on conflict (nome) do nothing;
