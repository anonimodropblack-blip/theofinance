import { obterTarifaFba } from '@/lib/fba'
import { obterTaxaPorFaixa } from '@/lib/taxa-faixa-preco'
import type { FaixaLogisticaFba, FaixaTaxaMarketplacePreco, LocalEstoque } from '@/types'

export type ResultadoPrecificacao = {
  custoFixoTotal: number
  valorImposto: number
  taxaPct: number
  usaTarifaFba: boolean
  pesoFaltando: boolean
  valorTarifaFba: number
  usaTaxaPorFaixa: boolean
  semFaixaPreco: boolean
  valorFixoFaixa: number
  valorAds: number
  lucro: number
  margem: number
  margemOk: boolean
  precoSugerido: number | null
}

// Cálculo de margem/lucro pra um produto + local de venda: comissão do
// marketplace (fixa % ou por faixa de preço), tarifa de logística FBA (por
// peso, só Amazon) e imposto. Usado pela Precificação (1 produto por vez) e
// pela tabela de Produtos (todos os produtos pro marketplace selecionado).
export function calcularPrecificacao(params: {
  precoVenda: number
  pesoGramas: number | null
  custoFixoTotal: number
  local: LocalEstoque | null
  faixasFba: FaixaLogisticaFba[]
  faixasPreco: FaixaTaxaMarketplacePreco[]
  impostoPercentual: number
  margemMinimaPercentual: number
  adsModo?: 'percentual' | 'valor' | null
  adsValor?: number | null
}): ResultadoPrecificacao {
  const { precoVenda, pesoGramas, custoFixoTotal, local, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsModo, adsValor } = params
  const impostoPct = impostoPercentual / 100
  const margemMinimaPct = margemMinimaPercentual / 100
  const adsPct = adsModo === 'percentual' ? (adsValor ?? 0) / 100 : 0
  const valorAdsFixo = adsModo === 'valor' ? (adsValor ?? 0) : 0

  const usaTaxaPorFaixa = local?.usa_taxa_por_faixa ?? false
  const faixaPreco = usaTaxaPorFaixa && precoVenda > 0
    ? obterTaxaPorFaixa(precoVenda, faixasPreco.filter((f) => f.local_id === local?.id))
    : null
  const semFaixaPreco = usaTaxaPorFaixa && precoVenda > 0 && faixaPreco == null
  const valorFixoFaixa = faixaPreco?.valorFixo ?? 0

  const taxaPct = usaTaxaPorFaixa ? (faixaPreco?.taxaPercentual ?? 0) / 100 : (local?.taxa_marketplace ?? 0) / 100

  const valorImposto = precoVenda * impostoPct
  const valorTaxa = precoVenda * taxaPct + valorFixoFaixa

  const usaTarifaFba = (local?.usa_tarifa_fba && local?.fba_logistica_ativa) ?? false
  const pesoFaltando = usaTarifaFba && pesoGramas == null
  const tarifaFba = usaTarifaFba && pesoGramas != null && precoVenda > 0
    ? obterTarifaFba(pesoGramas, precoVenda, faixasFba)
    : null
  const valorTarifaFba = tarifaFba ?? 0

  const valorAds = precoVenda * adsPct + valorAdsFixo

  const lucro = precoVenda - custoFixoTotal - valorImposto - valorTaxa - valorTarifaFba - valorAds
  const margem = precoVenda > 0 ? lucro / precoVenda : 0
  const margemOk = margem >= margemMinimaPct

  const denominador = 1 - margemMinimaPct - impostoPct - taxaPct - adsPct
  const precoSugerido = denominador > 0
    ? Math.ceil(((custoFixoTotal + valorTarifaFba + valorFixoFaixa + valorAdsFixo) / denominador) * 100) / 100
    : null

  return {
    custoFixoTotal, valorImposto, taxaPct,
    usaTarifaFba, pesoFaltando, valorTarifaFba,
    usaTaxaPorFaixa, semFaixaPreco, valorFixoFaixa,
    valorAds,
    lucro, margem, margemOk, precoSugerido,
  }
}
