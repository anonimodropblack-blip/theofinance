-- Fase 5: permite classificar contas fixas como receita ou despesa
-- (ex.: salário fixo, aluguel recebido vs. aluguel pago, internet)

alter table fixed_accounts
  add column if not exists type text not null default 'expense'
  check (type in ('expense', 'income'));

create index if not exists idx_fixed_accounts_type on fixed_accounts(type);

-- Registros antigos já ficam como 'expense' pelo default.
