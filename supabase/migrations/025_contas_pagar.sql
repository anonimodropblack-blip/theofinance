-- Contas a pagar: compras (normalmente lotes) feitas com prazo em vez de a vista.
-- Vencimento pode ser calculado no app a partir de "X dias de prazo" a partir da
-- data da compra, ou digitado direto -- aqui so guarda a data final. Pagamento
-- parcial: valor_pago vai subindo ate bater valor_total (status derivado no app,
-- ver src/lib/contas-pagar.ts).
create table if not exists contas_pagar (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  fornecedor text,
  lote_id uuid references lotes(id) on delete set null,
  valor_total numeric(12,2) not null check (valor_total > 0),
  valor_pago numeric(12,2) not null default 0 check (valor_pago >= 0),
  data_compra date not null default current_date,
  data_vencimento date not null,
  pago_em timestamptz,
  observacao text,
  created_at timestamptz not null default now()
);

alter table contas_pagar enable row level security;
drop policy if exists "authenticated_full_access" on contas_pagar;
create policy "authenticated_full_access" on contas_pagar for all using (auth.uid() is not null) with check (auth.uid() is not null);
