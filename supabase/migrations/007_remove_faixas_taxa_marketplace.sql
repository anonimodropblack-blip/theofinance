-- Remove a tabela de "faixas de comissão por preço" (migration 003), que era
-- uma tentativa de reproduzir a fórmula antiga da planilha do Leandro, mas
-- não corresponde à taxa real de nenhum marketplace. Substituída pelo modelo
-- real da Amazon (comissão fixa 12% + tarifa de logística por peso/preço,
-- migration 005), agora usado também na tela de Produtos.
drop table if exists faixas_taxa_marketplace;
