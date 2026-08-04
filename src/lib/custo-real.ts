import type { CategoriaCusto, Lote, LoteCusto, LoteItem } from '@/types'

export type LoteItemComLote = LoteItem & { lote: Lote }
export type LoteCustoComCategoria = LoteCusto & { categoria: CategoriaCusto }

export type CustoRealProduto = {
  custoUnitario: number
  custosLogistica: { nome: string; valor: number }[]
}

// Custo real por produto: média ponderada por quantidade entre TODAS as compras (lotes) que
// o contêm — não só a mais recente — de custo de compra + custos do lote (frete/embalagem etc)
// rateados por unidade.
export function calcularCustoRealPorProduto(
  loteItens: LoteItemComLote[],
  loteCustos: LoteCustoComCategoria[]
): Record<string, CustoRealProduto> {
  const itensPorLote = new Map<string, LoteItemComLote[]>()
  const itensPorProduto = new Map<string, LoteItemComLote[]>()
  for (const item of loteItens) {
    itensPorLote.set(item.lote_id, [...(itensPorLote.get(item.lote_id) ?? []), item])
    itensPorProduto.set(item.produto_id, [...(itensPorProduto.get(item.produto_id) ?? []), item])
  }

  const custosPorLote = new Map<string, LoteCustoComCategoria[]>()
  for (const custo of loteCustos) {
    custosPorLote.set(custo.lote_id, [...(custosPorLote.get(custo.lote_id) ?? []), custo])
  }

  const resultado: Record<string, CustoRealProduto> = {}
  for (const [produtoId, itens] of itensPorProduto) {
    let unidadesTotais = 0
    let custoCompraPonderado = 0
    const logisticaPonderada: Record<string, number> = {}

    for (const item of itens) {
      const totalUnidadesLote = (itensPorLote.get(item.lote_id) ?? []).reduce((s, i) => s + i.quantidade, 0)
      const custosDoLote = custosPorLote.get(item.lote_id) ?? []

      unidadesTotais += item.quantidade
      custoCompraPonderado += (item.custo_unitario ?? 0) * item.quantidade

      for (const c of custosDoLote) {
        const porUnidade = c.modo === 'por_unidade' ? c.valor : (totalUnidadesLote > 0 ? c.valor / totalUnidadesLote : 0)
        logisticaPonderada[c.categoria.nome] = (logisticaPonderada[c.categoria.nome] ?? 0) + porUnidade * item.quantidade
      }
    }

    resultado[produtoId] = {
      custoUnitario: unidadesTotais > 0 ? custoCompraPonderado / unidadesTotais : 0,
      custosLogistica: Object.entries(logisticaPonderada).map(([nome, valor]) => ({
        nome,
        valor: unidadesTotais > 0 ? valor / unidadesTotais : 0,
      })),
    }
  }
  return resultado
}
