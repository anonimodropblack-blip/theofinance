import type { CategoriaCusto, Lote, LoteCusto, LoteItem } from '@/types'

export type LoteItemComLote = LoteItem & { lote: Lote }
export type LoteCustoComCategoria = LoteCusto & { categoria: CategoriaCusto }

export type CustoRealProduto = {
  custoUnitario: number
  custosLogistica: { nome: string; valor: number }[]
}

// Custo real por produto a partir do lote mais recente que o contém (mesmo
// critério usado na Precificação): custo de compra + custos do lote
// (frete/embalagem etc) rateados por unidade.
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
    const maisRecente = [...itens].sort((a, b) => {
      const porData = new Date(b.lote.data).getTime() - new Date(a.lote.data).getTime()
      if (porData !== 0) return porData
      return new Date(b.lote.created_at).getTime() - new Date(a.lote.created_at).getTime()
    })[0]

    const totalUnidadesLote = (itensPorLote.get(maisRecente.lote_id) ?? []).reduce((s, i) => s + i.quantidade, 0)
    const custosDoLote = custosPorLote.get(maisRecente.lote_id) ?? []
    const porCategoria: Record<string, number> = {}
    for (const c of custosDoLote) {
      const porUnidade = c.modo === 'por_unidade' ? c.valor : (totalUnidadesLote > 0 ? c.valor / totalUnidadesLote : 0)
      porCategoria[c.categoria.nome] = (porCategoria[c.categoria.nome] ?? 0) + porUnidade
    }

    resultado[produtoId] = {
      custoUnitario: maisRecente.custo_unitario ?? 0,
      custosLogistica: Object.entries(porCategoria).map(([nome, valor]) => ({ nome, valor })),
    }
  }
  return resultado
}
