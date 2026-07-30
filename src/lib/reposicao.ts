import type { FechamentoMensalProduto } from '@/types'

// Média de vendas por dia calculada SÓ a partir do histórico real (fechamentos_mensais_produtos)
// — sem cair pra estimativa manual de "Vendas/mês". Enquanto não houver nenhum mês fechado
// pra esse produto, retorna null (sem dado suficiente ainda).
export function calcularMediaDiaria(fechamentosProduto: FechamentoMensalProduto[]): number | null {
  if (fechamentosProduto.length === 0) return null
  const totalVendas = fechamentosProduto.reduce((s, f) => s + f.vendas_qtd, 0)
  return totalVendas / fechamentosProduto.length / 30
}

export function calcularDiasEstoque(estoqueAtual: number, mediaDiaria: number | null): number | null {
  if (mediaDiaria == null || mediaDiaria <= 0) return null
  return estoqueAtual / mediaDiaria
}

// Quanto pedir no próximo lote pra cobrir o prazo de reposição (tempo até o pedido
// chegar) + a cobertura desejada depois que ele chegar, descontando o que já tem em estoque.
export function calcularSugestaoPedido(
  estoqueAtual: number,
  mediaDiaria: number | null,
  prazoReposicaoDias: number,
  coberturaDesejadaDias: number
): number | null {
  if (mediaDiaria == null) return null
  const sugestao = (prazoReposicaoDias + coberturaDesejadaDias) * mediaDiaria - estoqueAtual
  return Math.max(0, Math.round(sugestao))
}
