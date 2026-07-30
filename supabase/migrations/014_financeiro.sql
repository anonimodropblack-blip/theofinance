-- Módulo financeiro: regra de pró-labore, caixinhas (divisão do lucro que sobra) e
-- livro-caixa (lançamentos reais de entrada/saída, saldo sempre derivado da soma —
-- mesmo padrão do estoque, que é somado a partir de `movimentacoes`).

-- Pró-labore: piso é só referência/alerta (não entra na fórmula); alvo é o salário
-- confortável; acima do alvo, só uma % pequena do excedente é retirada — o resto
-- fica na empresa. Ver src/lib/prolabore.ts.
alter table configuracoes add column prolabore_piso numeric(12,2) not null default 1500;
alter table configuracoes add column prolabore_alvo numeric(12,2) not null default 3000;
alter table configuracoes add column prolabore_pct_excedente numeric(5,2) not null default 5;
alter table configuracoes add column prolabore_descontar_custo_fixo boolean not null default true;

-- Caixinhas: divisão configurável do que sobra do lucro depois do pró-labore.
-- conta_destino diz pra onde esse dinheiro vai quando a divisão é registrada — a
-- maioria fica só como orçamento reservado na conta operacional; a caixinha de
-- reserva/CDB de fato move o saldo pra conta 'reserva'.
create table caixinhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  percentual numeric(5,2) not null default 0,
  conta_destino text not null default 'operacional' check (conta_destino in ('operacional', 'reserva')),
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- Livro-caixa. `categoria` é texto livre e curto (ex: "Venda Shopee", "Conta de
-- luz") — sem taxonomia fixa. O único campo estruturado é `retirada`, porque é o
-- único que precisa ser somado com confiança (quanto já foi retirado no mês).
create table lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  tipo text not null check (tipo in ('entrada', 'saida')),
  conta text not null default 'operacional' check (conta in ('operacional', 'reserva')),
  retirada boolean not null default false,
  caixinha_id uuid references caixinhas(id) on delete set null,
  categoria text,
  valor numeric(12,2) not null check (valor > 0),
  descricao text,
  created_at timestamptz not null default now()
);

alter table caixinhas enable row level security;
alter table lancamentos_financeiros enable row level security;
create policy "authenticated_full_access" on caixinhas for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on lancamentos_financeiros for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into caixinhas (nome, percentual, conta_destino, ordem) values
  ('Reposição de Estoque', 40, 'operacional', 0),
  ('Novos Produtos', 30, 'operacional', 1),
  ('Reserva de Caixa (CDB)', 20, 'reserva', 2),
  ('Distribuição de Lucro', 10, 'operacional', 3);
