import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrecoPorLocal } from '@/types'

export type PrecosPorProdutoCanal = Record<string, Record<string, number>>

export function agruparPrecosPorLocal(rows: PrecoPorLocal[]): PrecosPorProdutoCanal {
  const mapa: PrecosPorProdutoCanal = {}
  for (const r of rows) {
    if (!mapa[r.produto_id]) mapa[r.produto_id] = {}
    mapa[r.produto_id][r.local_id] = r.preco_venda
  }
  return mapa
}

// Preço efetivo de um produto num canal: usa a exceção cadastrada pra esse
// canal se existir, senão cai no preço padrão do produto.
export function precoVendaEfetivo(
  produtoId: string,
  precoPadrao: number | null,
  localId: string | null,
  precosPorLocal: PrecosPorProdutoCanal
): number | null {
  if (localId) {
    const excecao = precosPorLocal[produtoId]?.[localId]
    if (excecao != null) return excecao
  }
  return precoPadrao
}

export async function salvarPrecoPorLocal(supabase: SupabaseClient, produtoId: string, localId: string, precoVenda: number) {
  const { error } = await supabase
    .from('precos_por_local')
    .upsert({ produto_id: produtoId, local_id: localId, preco_venda: precoVenda }, { onConflict: 'produto_id,local_id' })
  if (error) throw error
}

export async function removerPrecoPorLocal(supabase: SupabaseClient, produtoId: string, localId: string) {
  const { error } = await supabase.from('precos_por_local').delete().eq('produto_id', produtoId).eq('local_id', localId)
  if (error) throw error
}
