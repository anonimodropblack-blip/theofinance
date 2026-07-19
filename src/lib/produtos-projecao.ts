import { obterTarifaFba } from '@/lib/fba'
import type { FaixaLogisticaFba, Produto } from '@/types'

export function mesesDesde(iso: string) {
  const dias = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.floor(dias / 30))
}

// Projeção com os custos reais da Amazon (a mesma taxa e tarifa usadas na Precificação):
// comissão % do nicho (Saúde e Cuidados Pessoais) + tarifa de logística FBA por peso/preço + imposto.
// Não entra custo de lote (frete/embalagem) — isso já aparece com detalhe real na Precificação.
export function calcularProjecao(p: Produto, impostoPercentual: number, comissaoPercentual: number, margemMinimaPercentual: number, faixasFba: FaixaLogisticaFba[]) {
  const precoTotal = p.preco_custo_unitario != null && p.qtd_minima != null
    ? p.preco_custo_unitario * p.qtd_minima
    : null

  const valorComissao = p.preco_venda != null ? p.preco_venda * (comissaoPercentual / 100) : null
  const valorImposto = p.preco_venda != null ? p.preco_venda * (impostoPercentual / 100) : null
  const pesoFaltando = p.preco_venda != null && p.peso_gramas == null
  const valorLogistica = p.preco_venda != null && p.peso_gramas != null
    ? obterTarifaFba(p.peso_gramas, p.preco_venda, faixasFba)
    : null

  const lucroPorUnidade = p.preco_venda != null && p.preco_custo_unitario != null && valorComissao != null && valorImposto != null
    ? p.preco_venda - p.preco_custo_unitario - valorComissao - valorImposto - (valorLogistica ?? 0)
    : null

  const margemPct = lucroPorUnidade != null && p.preco_venda ? (lucroPorUnidade / p.preco_venda) * 100 : null

  const lucroMes = lucroPorUnidade != null && p.vendas_mes != null ? lucroPorUnidade * p.vendas_mes : null

  const lucroTotal = lucroMes != null ? lucroMes * mesesDesde(p.created_at) : null

  // Preço que atinge exatamente a margem mínima configurada, usando a logística da faixa atual como aproximação
  // (a tarifa muda por faixa de preço, então o valor exato pode variar um pouco após aplicar).
  const denominador = 1 - (margemMinimaPercentual / 100) - (comissaoPercentual / 100) - (impostoPercentual / 100)
  const precoSugerido = p.preco_custo_unitario != null && denominador > 0
    ? (p.preco_custo_unitario + (valorLogistica ?? 0)) / denominador
    : null

  return { precoTotal, valorComissao, valorImposto, valorLogistica, pesoFaltando, lucroPorUnidade, margemPct, lucroMes, lucroTotal, precoSugerido }
}
