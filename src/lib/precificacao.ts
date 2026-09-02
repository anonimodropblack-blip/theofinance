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
  precoMaximo: number | null
  lucroNoPrecoMinimo: number | null
  margemNoPrecoMinimo: number | null
  lucroNoPrecoMaximo: number | null
  margemNoPrecoMaximo: number | null
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
  margemMaximaPercentual?: number | null
  adsModo?: 'percentual' | 'valor' | null
  adsValor?: number | null
}): ResultadoPrecificacao {
  const { precoVenda, pesoGramas, custoFixoTotal, local, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, margemMaximaPercentual, adsModo, adsValor } = params
  const impostoPct = impostoPercentual / 100
  const margemMinimaPct = margemMinimaPercentual / 100
  const adsPct = adsModo === 'percentual' ? (adsValor ?? 0) / 100 : 0
  const valorAdsFixo = adsModo === 'valor' ? (adsValor ?? 0) : 0

  const usaTaxaPorFaixa = local?.usa_taxa_por_faixa ?? false
  const faixaPreco = usaTaxaPorFaixa && precoVenda > 0
    ? obterTaxaPorFaixa(precoVenda, faixasPreco.filter((f) => f.local_id === local?.id && f.ativo))
    : null
  const semFaixaPreco = usaTaxaPorFaixa && precoVenda > 0 && faixaPreco == null
  const valorFixoFaixa = faixaPreco?.valorFixo ?? 0

  const taxaPct = usaTaxaPorFaixa ? (faixaPreco?.taxaPercentual ?? 0) / 100 : (local?.taxa_marketplace ?? 0) / 100

  const valorImposto = precoVenda * impostoPct
  const valorTaxa = precoVenda * taxaPct + valorFixoFaixa

  const usaTarifaFba = (local?.usa_tarifa_fba && local?.fba_logistica_ativa) ?? false
  const pesoFaltando = usaTarifaFba && pesoGramas == null
  const tarifaFba = usaTarifaFba && pesoGramas != null && precoVenda > 0
    ? obterTarifaFba(pesoGramas, precoVenda, faixasFba.filter((f) => f.local_id === local?.id && f.ativo))
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

  // Preço máximo saudável: mesma conta do preço mínimo, mas mirando a margem máxima
  // configurada (teto opcional) — acima desse preço a margem passa do teto. Arredonda pra
  // baixo (Math.floor) pra não estourar o teto por causa do arredondamento.
  const margemMaximaPct = margemMaximaPercentual != null ? margemMaximaPercentual / 100 : null
  const denominadorMax = margemMaximaPct != null ? 1 - margemMaximaPct - impostoPct - taxaPct - adsPct : null
  const precoMaximo = denominadorMax != null && denominadorMax > 0
    ? Math.floor(((custoFixoTotal + valorTarifaFba + valorFixoFaixa + valorAdsFixo) / denominadorMax) * 100) / 100
    : null

  // Lucro/margem reais no preço mínimo e no máximo sugeridos — recalcula taxa/tarifa
  // nesse preço (não no preço atual) porque comissão por faixa e tarifa FBA por peso
  // podem mudar de faixa dependendo do preço, então não dá pra só aplicar a margem
  // configurada direto: o arredondamento de centavos no preço sugerido também desloca
  // o resultado um pouquinho.
  function lucroEMargemNoPreco(precoAlvo: number) {
    const valorImpostoAlvo = precoAlvo * impostoPct
    const faixaAlvo = usaTaxaPorFaixa && precoAlvo > 0
      ? obterTaxaPorFaixa(precoAlvo, faixasPreco.filter((f) => f.local_id === local?.id && f.ativo))
      : null
    const taxaPctAlvo = usaTaxaPorFaixa ? (faixaAlvo?.taxaPercentual ?? 0) / 100 : (local?.taxa_marketplace ?? 0) / 100
    const valorFixoFaixaAlvo = faixaAlvo?.valorFixo ?? 0
    const valorTaxaAlvo = precoAlvo * taxaPctAlvo + valorFixoFaixaAlvo
    const tarifaFbaAlvo = usaTarifaFba && pesoGramas != null && precoAlvo > 0
      ? obterTarifaFba(pesoGramas, precoAlvo, faixasFba.filter((f) => f.local_id === local?.id && f.ativo))
      : null
    const valorTarifaFbaAlvo = tarifaFbaAlvo ?? 0
    const valorAdsAlvo = precoAlvo * adsPct + valorAdsFixo
    const lucroAlvo = precoAlvo - custoFixoTotal - valorImpostoAlvo - valorTaxaAlvo - valorTarifaFbaAlvo - valorAdsAlvo
    const margemAlvo = precoAlvo > 0 ? lucroAlvo / precoAlvo : 0
    return { lucro: lucroAlvo, margem: margemAlvo }
  }

  const noPrecoMinimo = precoSugerido != null ? lucroEMargemNoPreco(precoSugerido) : null
  const noPrecoMaximo = precoMaximo != null ? lucroEMargemNoPreco(precoMaximo) : null

  return {
    custoFixoTotal, valorImposto, taxaPct,
    usaTarifaFba, pesoFaltando, valorTarifaFba,
    usaTaxaPorFaixa, semFaixaPreco, valorFixoFaixa,
    valorAds,
    lucro, margem, margemOk, precoSugerido, precoMaximo,
    lucroNoPrecoMinimo: noPrecoMinimo?.lucro ?? null,
    margemNoPrecoMinimo: noPrecoMinimo?.margem ?? null,
    lucroNoPrecoMaximo: noPrecoMaximo?.lucro ?? null,
    margemNoPrecoMaximo: noPrecoMaximo?.margem ?? null,
  }
}
