import type { SupabaseClient } from '@supabase/supabase-js'
import { ajustarEstoque } from '@/lib/estoque'
import type { ContaPagar } from '@/types'

// Roda toda vez que uma conta a pagar é marcada como paga. Se ela (ou, no caso
// de parcelamento, TODAS as parcelas do mesmo grupo) estiver vinculada a um
// lote que ainda não teve o estoque lançado, dá entrada automaticamente —
// sem precisar configurar Produtos/Estoque de novo à mão.
//
// Trava contra duplicar: o UPDATE que marca o lote como confirmado só afeta
// linha se `estoque_confirmado` ainda for false (WHERE ... AND estoque_confirmado = false).
// Se duas chamadas chegarem quase juntas (ex: usuário clicou duas vezes), só a
// primeira consegue a linha — a segunda não recebe nada de volta e para aí,
// então o estoque nunca é lançado duas vezes pro mesmo lote.
export async function confirmarEstoqueSeQuitado(supabase: SupabaseClient, conta: ContaPagar): Promise<void> {
  if (!conta.lote_id) return

  let contasDoGrupo: ContaPagar[]
  if (conta.grupo_parcelamento_id) {
    const { data } = await supabase.from('contas_pagar').select('*').eq('grupo_parcelamento_id', conta.grupo_parcelamento_id)
    contasDoGrupo = (data ?? []) as ContaPagar[]
  } else {
    contasDoGrupo = [conta]
  }
  const todasQuitadas = contasDoGrupo.every((c) => c.valor_pago >= c.valor_total)
  if (!todasQuitadas) return

  const { data: lote } = await supabase.from('lotes').select('*').eq('id', conta.lote_id).single()
  if (!lote || lote.estoque_confirmado) return

  const { data: loteTravado } = await supabase
    .from('lotes')
    .update({ estoque_confirmado: true })
    .eq('id', lote.id)
    .eq('estoque_confirmado', false)
    .select()
    .maybeSingle()
  if (!loteTravado) return // outra chamada já pegou essa trava — não faz nada de novo

  const { data: itens } = await supabase.from('lote_itens').select('*').eq('lote_id', lote.id)
  const { data: casa } = await supabase.from('locais_estoque').select('id').eq('nome', 'Casa').single()
  if (!casa || !itens || itens.length === 0) return

  for (const item of itens) {
    await ajustarEstoque(supabase, item.produto_id, casa.id, item.quantidade)
  }

  await supabase.from('movimentacoes').insert(
    itens.map((i) => ({
      produto_id: i.produto_id,
      tipo: 'entrada_lote' as const,
      quantidade: i.quantidade,
      destino_local_id: casa.id,
      lote_id: lote.id,
      data: new Date().toISOString().slice(0, 10),
    }))
  )
}
