-- Devolucao/cancelamento de pedido: em vez de apagar o pedido, marca o status.
-- 'confirmado' e o padrao (pedido normal, ja lancado hoje). Ao mudar de/para
-- 'confirmado' o app tambem ajusta estoque e vendas_mes_canal (ver alterarStatusPedido
-- em src/app/dashboard/pedidos/page.tsx) -- a coluna aqui so guarda o status.
alter table pedidos add column if not exists status text not null default 'confirmado';
alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check check (status in ('confirmado', 'devolvido', 'cancelado'));
