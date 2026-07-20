import type { FaixaTaxaMarketplacePreco } from '@/types'

// Taxa (comissão % + valor fixo R$) por faixa de preço de venda — usado por
// marketplaces como Mercado Livre, Shopee e TikTok, que variam a taxa
// conforme o preço do produto (diferente da Amazon FBA, que varia por peso).
export function obterTaxaPorFaixa(precoVenda: number, faixas: FaixaTaxaMarketplacePreco[]) {
  const faixa = faixas.find(
    (f) => precoVenda >= f.preco_min && (f.preco_max == null || precoVenda <= f.preco_max)
  )
  return faixa ? { taxaPercentual: faixa.taxa_percentual, valorFixo: faixa.valor_fixo } : null
}
