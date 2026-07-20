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
  faixasFba: FaixaLogisticaFba[],
  faixasPreco: FaixaTaxaMarketplacePreco[],
  impostoPercentual: number,
  margemMinimaPercentual: number
): ProjecaoProduto {
  const precoTotal = p.preco_custo_unitario != null && p.qtd_minima != null
    ? p.preco_custo_unitario * p.qtd_minima
    : null

  const usandoCustoReal = custoReal != null
  const custoFixoTotal = usandoCustoReal
    ? custoReal.custoUnitario + custoReal.custosLogistica.reduce((s, c) => s + c.valor, 0)
    : p.preco_custo_unitario

  if (p.preco_venda == null || custoFixoTotal == null) {
    return {
      precoTotal, usandoCustoReal,
      valorComissao: null, taxaPct: null, valorImposto: null, valorExtra: null, labelExtra: null,
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
  })

  const labelExtra = r.usaTarifaFba ? 'Logística FBA' : r.usaTaxaPorFaixa ? 'Taxa Fixa' : null
  const valorExtra = r.usaTarifaFba ? r.valorTarifaFba : r.usaTaxaPorFaixa ? r.valorFixoFaixa : null
  const lucroMes = p.vendas_mes != null ? r.lucro * p.vendas_mes : null

  return {
    precoTotal, usandoCustoReal,
    valorComissao: p.preco_venda * r.taxaPct,
    taxaPct: r.taxaPct * 100,
    valorImposto: r.valorImposto,
    valorExtra, labelExtra,
    pesoFaltando: r.pesoFaltando,
    semFaixaPreco: r.semFaixaPreco,
    lucroPorUnidade: r.lucro,
    margemPct: r.margem * 100,
    lucroMes,
    precoSugerido: r.precoSugerido,
  }
}
