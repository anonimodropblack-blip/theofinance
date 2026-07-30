import type { VendaMesCanal } from '@/types'

export type VendasPorProdutoCanal = Record<string, Record<string, number>>

export function agruparVendasCanal(rows: VendaMesCanal[]): VendasPorProdutoCanal {
  const mapa: VendasPorProdutoCanal = {}
  for (const v of rows) {
    if (!mapa[v.produto_id]) mapa[v.produto_id] = {}
    mapa[v.produto_id][v.local_id] = v.quantidade
  }
  return mapa
}

export function totalVendasProduto(vendasCanal: VendasPorProdutoCanal, produtoId: string): number {
  return Object.values(vendasCanal[produtoId] ?? {}).reduce((s, q) => s + q, 0)
}
