import type { SupabaseClient } from '@supabase/supabase-js'
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

// Soma (nunca sobrescreve) uma quantidade vendida em vendas_mes_canal pra um produto x
// canal — usado ao lançar um pedido, pra manter a estimativa mensal (usada em Dashboard,
// Produtos, Precificação) em dia com o que realmente foi vendido.
export async function somarVendaMesCanal(
  supabase: SupabaseClient,
  produtoId: string,
  localId: string,
  delta: number
) {
  const { data: existente } = await supabase
    .from('vendas_mes_canal')
    .select('id, quantidade')
    .eq('produto_id', produtoId)
    .eq('local_id', localId)
    .maybeSingle()

  if (existente) {
    await supabase.from('vendas_mes_canal').update({ quantidade: existente.quantidade + delta }).eq('id', existente.id)
  } else {
    await supabase.from('vendas_mes_canal').insert({ produto_id: produtoId, local_id: localId, quantidade: delta })
  }
}
