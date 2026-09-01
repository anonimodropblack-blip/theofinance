import type { SupabaseClient } from '@supabase/supabase-js'
import type { VendaMesCanal } from '@/types'

export type DadosVendaCanal = { quantidade: number; gastoAds: number }
export type VendasPorProdutoCanal = Record<string, Record<string, DadosVendaCanal>>

export function agruparVendasCanal(rows: VendaMesCanal[]): VendasPorProdutoCanal {
  const mapa: VendasPorProdutoCanal = {}
  for (const v of rows) {
    if (!mapa[v.produto_id]) mapa[v.produto_id] = {}
    mapa[v.produto_id][v.local_id] = { quantidade: v.quantidade, gastoAds: v.gasto_ads ?? 0 }
  }
  return mapa
}

export function totalVendasProduto(vendasCanal: VendasPorProdutoCanal, produtoId: string): number {
  return Object.values(vendasCanal[produtoId] ?? {}).reduce((s, d) => s + d.quantidade, 0)
}

// Soma (nunca sobrescreve) uma quantidade vendida e um gasto real de ads em
// vendas_mes_canal pra um produto x canal — usado ao lançar um pedido, pra manter a
// estimativa mensal (usada em Dashboard, Produtos, Precificação) em dia com o que
// realmente foi vendido e gasto em ads.
export async function somarVendaMesCanal(
  supabase: SupabaseClient,
  produtoId: string,
  localId: string,
  deltaQuantidade: number,
  deltaGastoAds = 0
) {
  const { data: existente, error: erroSelect } = await supabase
    .from('vendas_mes_canal')
    .select('id, quantidade, gasto_ads')
    .eq('produto_id', produtoId)
    .eq('local_id', localId)
    .maybeSingle()

  if (erroSelect) throw erroSelect

  if (existente) {
    const { error } = await supabase
      .from('vendas_mes_canal')
      .update({
        quantidade: existente.quantidade + deltaQuantidade,
        gasto_ads: (existente.gasto_ads ?? 0) + deltaGastoAds,
      })
      .eq('id', existente.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('vendas_mes_canal')
      .insert({ produto_id: produtoId, local_id: localId, quantidade: deltaQuantidade, gasto_ads: deltaGastoAds })
    if (error) throw error
  }
}
