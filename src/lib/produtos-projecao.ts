import { calcularPrecificacao } from '@/lib/precificacao'
import type { CustoRealProduto } from '@/lib/custo-real'
import type { FaixaLogisticaFba, FaixaTaxaMarketplacePreco, LocalEstoque, Produto } from '@/types'

export type ProjecaoProduto = {
  precoTotal: number | null
  usandoCustoReal: boolean
  valorComissao: number | null
  taxaPct: number | null
  valorImposto: number | null
  valorExtra: number | null
  labelExtra: 'Logística FBA' | 'Taxa Fixa' | null
  valorAds: number | null
  usandoAdsDiluido: boolean
  pesoFaltando: boolean
  semFaixaPreco: boolean
  lucroPorUnidade: number | null
  margemPct: number | null
  lucroMes: number | null
  precoSugerido: number | null
}

// Projeção de margem/lucro por produto pro marketplace selecionado. Usa o
// custo real do lote mais recente quando existe (igual à Precificação); se o
// produto ainda não tem lote, cai pro custo estimado digitado manualmente no
// cadastro (usandoCustoReal = false avisa qual dos dois está em uso).
export function calcularProjecao(
  p: Produto,
  custoReal: CustoRealProduto | null,
  local: LocalEstoque | null,
  quantidadeVendidaCanal: number,
  faixasFba: FaixaLogisticaFba[],
  faixasPreco: FaixaTaxaMarketplacePreco[],
  impostoPercentual: number,
  margemMinimaPercentual: number,
  adsDiluidoPorUnidade = 0
): ProjecaoProduto {
  const precoTotal = p.preco_custo_unitario != null && p.qtd_minima != null
    ? p.preco_custo_unitario * p.qtd_minima
    : null

  const usandoCustoReal = custoReal != null
  const custoFixoTotal = usandoCustoReal
    ? custoReal.custoUnitario + custoReal.custosLogistica.reduce((s, c) => s + c.valor, 0)
    : p.preco_custo_unitario

  const usandoAdsDiluido = p.ads_modo == null && adsDiluidoPorUnidade > 0
  const adsModoEfetivo = p.ads_modo ?? (usandoAdsDiluido ? 'valor' : null)
  const adsValorEfetivo = p.ads_modo != null ? p.ads_valor : adsDiluidoPorUnidade

  if (p.preco_venda == null || custoFixoTotal == null) {
    return {
      precoTotal, usandoCustoReal,
      valorComissao: null, taxaPct: null, valorImposto: null, valorExtra: null, labelExtra: null,
      valorAds: null, usandoAdsDiluido,
      pesoFaltando: false, semFaixaPreco: false,
      lucroPorUnidade: null, margemPct: null, lucroMes: null, precoSugerido: null,
    }
  }

  const r = calcularPrecificacao({
    precoVenda: p.preco_venda,
    pesoGramas: p.peso_gramas,
    custoFixoTotal,
    local,
    faixasFba,
    faixasPreco,
    impostoPercentual,
    margemMinimaPercentual,
    adsModo: adsModoEfetivo,
    adsValor: adsValorEfetivo,
  })

  const labelExtra = r.usaTarifaFba ? 'Logística FBA' : r.usaTaxaPorFaixa ? 'Taxa Fixa' : null
  const valorExtra = r.usaTarifaFba ? r.valorTarifaFba : r.usaTaxaPorFaixa ? r.valorFixoFaixa : null
  const lucroMes = r.lucro * quantidadeVendidaCanal

  return {
    precoTotal, usandoCustoReal,
    valorComissao: p.preco_venda * r.taxaPct,
    taxaPct: r.taxaPct * 100,
    valorImposto: r.valorImposto,
    valorExtra, labelExtra,
    valorAds: r.valorAds, usandoAdsDiluido,
    pesoFaltando: r.pesoFaltando,
    semFaixaPreco: r.semFaixaPreco,
    lucroPorUnidade: r.lucro,
    margemPct: r.margem * 100,
    lucroMes,
    precoSugerido: r.precoSugerido,
  }
}

export type ProjecaoTotalProduto = {
  lucroMes: number
  vendasQtd: number
  faturamento: number
}

// Soma o lucro/faturamento/quantidade de um produto em TODOS os canais onde ele vende
// (roda calcularProjecao uma vez por canal, com a comissão/tarifa real daquele
// marketplace, e soma os resultados) — cada canal tem sua própria taxa, então não dá
// pra projetar o total assumindo que tudo vendeu num canal só.
export function calcularProjecaoTotal(
  p: Produto,
  custoReal: CustoRealProduto | null,
  vendasCanalProduto: Record<string, number>,
  locaisPorId: Map<string, LocalEstoque>,
  faixasFba: FaixaLogisticaFba[],
  faixasPreco: FaixaTaxaMarketplacePreco[],
  impostoPercentual: number,
  margemMinimaPercentual: number,
  adsDiluidoPorUnidade = 0,
  precosPorCanal: Record<string, number> = {}
): ProjecaoTotalProduto {
  let lucroMes = 0
  let vendasQtd = 0
  let faturamento = 0
  for (const [localId, qtd] of Object.entries(vendasCanalProduto)) {
    if (qtd <= 0) continue
    const local = locaisPorId.get(localId) ?? null
    const precoEfetivo = precosPorCanal[localId] ?? p.preco_venda
    const produtoEfetivo = precoEfetivo !== p.preco_venda ? { ...p, preco_venda: precoEfetivo } : p
    const r = calcularProjecao(produtoEfetivo, custoReal, local, qtd, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
    lucroMes += r.lucroMes ?? 0
    vendasQtd += qtd
    faturamento += (precoEfetivo ?? 0) * qtd
  }
  return { lucroMes, vendasQtd, faturamento }
}
