-- Parcelamento em Contas a Pagar: quando uma compra e parcelada, cada parcela
-- vira uma linha propria em contas_pagar (valor e vencimento proprios, pode
-- ser paga/atrasada independente das outras), ligadas pelo mesmo
-- grupo_parcelamento_id so pra mostrar "Parcela X de Y" na tela. Contas
-- avulsas (sem parcelamento) ficam com esses 3 campos nulos, como sempre.
alter table contas_pagar add column if not exists grupo_parcelamento_id uuid;
alter table contas_pagar add column if not exists numero_parcela int;
alter table contas_pagar add column if not exists total_parcelas int;
