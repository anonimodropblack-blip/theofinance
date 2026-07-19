import { obterTarifaFba } from '@/lib/fba'
import type { FaixaLogisticaFba, Produto } from '@/types'

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

  // Preço que atinge a margem mínima configurada, usando a logística da faixa atual como aproximação
  // (a tarifa muda por faixa de preço, então o valor exato pode variar um pouco após aplicar).
  // Arredonda pra CIMA (centavo acima) — arredondar pro centavo mais próximo às vezes arredonda
  // pra baixo e a margem final fica uma fração abaixo do mínimo de novo, oferecendo "Aplicar"
  // pra sempre com o mesmo valor sem nunca resolver.
  const denominador = 1 - (margemMinimaPercentual / 100) - (comissaoPercentual / 100) - (impostoPercentual / 100)
  const precoSugerido = p.preco_custo_unitario != null && denominador > 0
    ? Math.ceil(((p.preco_custo_unitario + (valorLogistica ?? 0)) / denominador) * 100) / 100
    : null

  return { precoTotal, valorComissao, valorImposto, valorLogistica, pesoFaltando, lucroPorUnidade, margemPct, lucroMes, precoSugerido }
}
