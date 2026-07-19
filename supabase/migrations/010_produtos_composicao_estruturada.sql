-- Separa o campo "fórmula" (texto único, ex: "Biotina 45mcg + Tiamina 2mg — 60 cápsulas")
-- em campos estruturados: composição/dosagem, quantidade da embalagem e unidade.
-- Migra os dados dos 17 produtos reais já cadastrados e remove o campo antigo.

alter table produtos add column composicao text;
alter table produtos add column quantidade_embalagem int;
alter table produtos add column unidade_embalagem text check (unidade_embalagem in ('cápsulas', 'ml', 'gotas', 'porções', 'softgel'));

update produtos set composicao = 'Beta-alanina 2g (100% pura)', quantidade_embalagem = 150, unidade_embalagem = 'porções' where nome = 'Beta Alanina';
update produtos set composicao = 'Biotina 45mcg + Tiamina 2mg + Pantotenato de Cálcio 5mg + Ácido Fólico 1.200mcg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Biotina + Vitaminas';
update produtos set composicao = 'Colágeno tipo II 40mg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Colágeno Tipo II';
update produtos set composicao = 'Complexo B + Vitamina D3 2.000UI + Zinco 29mg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Complexo B';
update produtos set composicao = 'Coenzima Q10 200mg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'CoQ10';
update produtos set composicao = 'Curcumina 130mg + Magnésio 63mg + Zinco 29mg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Cúrcuma + Magnésio + Zinco';
update produtos set composicao = 'Magnésio 200mg + L-Treonina 460mg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Magnésio + L-Treonina';
update produtos set composicao = 'Magnésio Dimalato 260mg elementar', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Magnésio Dimalato';
update produtos set composicao = 'Magnésio Quelato 350mg elementar', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Magnésio Quelato';
update produtos set composicao = 'Melatonina 210mcg sabor maracujá (gotas)', quantidade_embalagem = 30, unidade_embalagem = 'ml' where nome = 'Melatonina';
update produtos set composicao = 'EPA 990mg + DHA 660mg', quantidade_embalagem = 120, unidade_embalagem = 'softgel' where nome = 'Ômega 3 EPA/DHA';
update produtos set composicao = 'Picolinato de Cromo 250mcg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Picolinato de Cromo';
update produtos set composicao = 'Multivitamínico A-Z completo', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Polivitamínico A-Z';
update produtos set composicao = 'EPA 540mg + DHA 360mg', quantidade_embalagem = 120, unidade_embalagem = 'softgel' where nome = 'Super Gold Ômega';
update produtos set composicao = '320mg de Magnésio elementar (Dimalato+Taurato+Bisglicinato)', quantidade_embalagem = 90, unidade_embalagem = 'cápsulas' where nome = 'Trio Magnésio Dimalato + Taurato + Bisglicinato';
update produtos set composicao = 'Metilcobalamina 9,5mcg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Vitamina B12';
update produtos set composicao = 'Vitamina D3 2.000UI + Vitamina K2 100mcg', quantidade_embalagem = 60, unidade_embalagem = 'cápsulas' where nome = 'Vitamina D3 + K2';

alter table produtos drop column formula;
