-- Custo fixo mensal (ex: mensalidade Plano Profissional Amazon R$19/mês) —
-- não entra na margem por produto (não dá pra ratear com precisão), só é
-- exibido como referência no Dashboard.
alter table configuracoes add column custo_fixo_mensal numeric(12,2) not null default 0;
