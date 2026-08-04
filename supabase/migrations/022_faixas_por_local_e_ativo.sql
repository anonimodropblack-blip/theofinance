-- ============================================================
-- Generaliza faixas_logistica_fba pra qualquer marketplace (nao so
-- Amazon) e adiciona ativo/inativo em ambas as tabelas de faixa.
-- ============================================================

alter table faixas_logistica_fba add column if not exists local_id uuid references locais_estoque(id) on delete cascade;
alter table faixas_logistica_fba add column if not exists ativo boolean not null default true;
alter table faixas_taxa_marketplace_preco add column if not exists ativo boolean not null default true;

-- Backfill: as faixas existentes sao as da Amazon FBA (unico local com
-- usa_tarifa_fba = true ate hoje).
update faixas_logistica_fba
set local_id = (select id from locais_estoque where nome = 'Amazon FBA')
where local_id is null;

alter table faixas_logistica_fba alter column local_id set not null;
