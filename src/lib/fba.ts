import type { FaixaLogisticaFba } from '@/types'

// Tarifa de logística FBA: valor fixo em R$ conforme faixa de peso do produto e faixa de preço de venda.
export function obterTarifaFba(pesoGramas: number, precoVenda: number, faixas: FaixaLogisticaFba[]) {
  const faixa = faixas.find(
    (f) =>
      pesoGramas >= f.peso_min && (f.peso_max == null || pesoGramas <= f.peso_max) &&
      precoVenda >= f.preco_min && (f.preco_max == null || precoVenda <= f.preco_max)
  )
  return faixa ? faixa.valor_fixo : null
}
