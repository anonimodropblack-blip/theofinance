-- Permite arquivar (desativar) um lote sem apagar histórico de custos/movimentações.
alter table lotes add column ativo boolean not null default true;

-- Gasto total com anúncios no mês, diluído entre os produtos proporcional
-- às vendas/mês de cada um (usado quando o produto não tem ads_valor manual).
alter table configuracoes add column gasto_ads_mensal numeric(12,2) not null default 0;
