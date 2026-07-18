import type { SupabaseClient } from '@supabase/supabase-js'

// Soma (ou subtrai, se delta for negativo) uma quantidade no estoque de um produto num local.
export async function ajustarEstoque(
  supabase: SupabaseClient,
  produtoId: string,
  localId: string,
  delta: number
) {
  const { data: existente } = await supabase
    .from('estoque')
    .select('id, quantidade')
    .eq('produto_id', produtoId)
    .eq('local_id', localId)
    .maybeSingle()

  if (existente) {
    await supabase.from('estoque').update({ quantidade: existente.quantidade + delta }).eq('id', existente.id)
  } else {
    await supabase.from('estoque').insert({ produto_id: produtoId, local_id: localId, quantidade: delta })
  }
}
