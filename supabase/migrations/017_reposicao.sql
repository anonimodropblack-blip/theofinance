-- Reposição de estoque: parâmetros globais pro cálculo de "quanto pedir no próximo
-- lote" (média de vendas/dia real, calculada a partir do histórico de fechamentos —
-- ver src/lib/reposicao.ts).
alter table configuracoes add column prazo_reposicao_dias int not null default 30;
alter table configuracoes add column estoque_cobertura_dias int not null default 60;
