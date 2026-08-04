-- ============================================================
-- Vincula lançamentos financeiros ao lote de origem + lança
-- retroativamente a despesa de todo lote que ainda não tem uma.
-- ============================================================

alter table lancamentos_financeiros add column lote_id uuid references lotes(id) on delete set null;

-- Vincula lançamentos que a automação de Compras já criou (antes dessa coluna existir)
-- ao lote correspondente, casando pela descrição — evita duplicar no passo seguinte.
update lancamentos_financeiros lf
set lote_id = l.id
from lotes l
where lf.lote_id is null
  and lf.descricao = l.codigo || ' — ' || l.fornecedor;

-- Lança a despesa retroativa pra todo lote que ainda não tem lançamento vinculado.
insert into lancamentos_financeiros (tipo, conta, retirada, caixinha_id, categoria, valor, data, descricao, lote_id)
select
  'saida',
  'operacional',
  false,
  null,
  'Estoque',
  itens.total_itens + coalesce(custos.total_custos, 0),
  l.data,
  l.codigo || ' — ' || l.fornecedor,
  l.id
from lotes l
join (
  select lote_id, sum(quantidade * coalesce(custo_unitario, 0)) as total_itens, sum(quantidade) as total_unidades
  from lote_itens
  group by lote_id
) itens on itens.lote_id = l.id
left join (
  select lc.lote_id,
    sum(case when lc.modo = 'por_unidade' then lc.valor * it.total_unidades else lc.valor end) as total_custos
  from lote_custos lc
  join (select lote_id, sum(quantidade) as total_unidades from lote_itens group by lote_id) it on it.lote_id = lc.lote_id
  group by lc.lote_id
) custos on custos.lote_id = l.id
where not exists (
  select 1 from lancamentos_financeiros lf where lf.lote_id = l.id
);
