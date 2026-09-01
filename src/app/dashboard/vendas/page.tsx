'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Loader2, ShoppingCart } from 'lucide-react'
import { NovoPedidoDialog } from '@/components/pedidos/novo-pedido-dialog'
import { PedidoItem } from '@/components/pedidos/pedido-item'
import { ajustarEstoque } from '@/lib/estoque'
import { somarVendaMesCanal } from '@/lib/vendas-canal'
import { agruparPrecosPorLocal, type PrecosPorProdutoCanal } from '@/lib/precos'
import { formatCurrency, type PedidoCompleto } from '@/lib/pedidos'
import { toast } from 'sonner'
import type { Estoque, LocalEstoque, Pedido, PrecoPorLocal, Produto } from '@/types'

export default function VendasPage() {
  const supabase = useMemo(() => createClient(), [])
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [estoque, setEstoque] = useState<Estoque[]>([])
  const [precosPorCanal, setPrecosPorCanal] = useState<PrecosPorProdutoCanal>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: peds }, { data: prods }, { data: locs }, { data: est }, { data: precosData }] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, produto:produtos(*), local:local_id(*)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
      supabase.from('estoque').select('*'),
      supabase.from('precos_por_local').select('*'),
    ])
    setPedidos((peds ?? []) as unknown as PedidoCompleto[])
    setProdutos((prods ?? []) as Produto[])
    setLocais((locs ?? []) as LocalEstoque[])
    setEstoque((est ?? []) as Estoque[])
    setPrecosPorCanal(agruparPrecosPorLocal((precosData ?? []) as PrecoPorLocal[]))
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  // Muda o status de um pedido (confirmado/devolvido/cancelado). Ao SAIR de
  // "confirmado" devolve a quantidade pro estoque e tira da estimativa de
  // vendas/mês; ao VOLTAR pra "confirmado" faz o inverso — mantém estoque e
  // vendas/mês corretos independente de quantas vezes o status mudar.
  async function alterarStatusPedido(pedido: PedidoCompleto, novoStatus: Pedido['status']) {
    if (novoStatus === pedido.status) return
    const eraConfirmado = pedido.status === 'confirmado'
    const ficaConfirmado = novoStatus === 'confirmado'
    try {
      if (eraConfirmado && !ficaConfirmado) {
        await ajustarEstoque(supabase, pedido.produto_id, pedido.local_id, pedido.quantidade)
        await somarVendaMesCanal(supabase, pedido.produto_id, pedido.local_id, -pedido.quantidade, -(pedido.gasto_ads ?? 0))
      } else if (!eraConfirmado && ficaConfirmado) {
        await ajustarEstoque(supabase, pedido.produto_id, pedido.local_id, -pedido.quantidade)
        await somarVendaMesCanal(supabase, pedido.produto_id, pedido.local_id, pedido.quantidade, pedido.gasto_ads ?? 0)
      }
    } catch {
      toast.error('Não deu pra ajustar estoque/vendas. Status não foi alterado.')
      return
    }
    const { error } = await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedido.id)
    if (error) {
      toast.error('Erro ao alterar status da venda.')
      return
    }
    toast.success(
      novoStatus === 'confirmado' ? 'Venda reativada' : novoStatus === 'devolvido' ? 'Venda marcada como devolvida' : 'Venda marcada como cancelada'
    )
    carregar()
  }

  // Excluir de verdade (não é só mudar status): se a venda ainda estava confirmada,
  // devolve estoque/vendas-do-mês antes de apagar a linha — mesma lógica de "sair de
  // confirmado" acima, pra não perder o ajuste só porque pulou direto pra exclusão.
  async function excluirPedido(pedido: PedidoCompleto) {
    if (!window.confirm(`Excluir essa venda de "${pedido.produto?.nome}"? Essa ação não pode ser desfeita.`)) return
    if (pedido.status === 'confirmado') {
      try {
        await ajustarEstoque(supabase, pedido.produto_id, pedido.local_id, pedido.quantidade)
        await somarVendaMesCanal(supabase, pedido.produto_id, pedido.local_id, -pedido.quantidade, -(pedido.gasto_ads ?? 0))
      } catch {
        toast.error('Não deu pra devolver estoque/vendas. Venda não foi excluída.')
        return
      }
    }
    const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id)
    if (error) {
      toast.error('Erro ao excluir venda.')
      return
    }
    toast.success('Venda excluída')
    carregar()
  }

  const resumo = useMemo(() => {
    let vendidoQtd = 0, vendidoValor = 0
    let devolvidoQtd = 0, devolvidoValor = 0
    let canceladoQtd = 0, canceladoValor = 0
    for (const p of pedidos) {
      const valor = p.quantidade * p.preco_unitario
      if (p.status === 'confirmado') { vendidoQtd += p.quantidade; vendidoValor += valor }
      else if (p.status === 'devolvido') { devolvidoQtd += p.quantidade; devolvidoValor += valor }
      else { canceladoQtd += p.quantidade; canceladoValor += valor }
    }
    return { vendidoQtd, vendidoValor, devolvidoQtd, devolvidoValor, canceladoQtd, canceladoValor }
  }, [pedidos])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Confirmados</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {resumo.vendidoQtd} un. <span className="text-sm text-muted-foreground font-normal">({formatCurrency(resumo.vendidoValor)})</span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Devoluções</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {resumo.devolvidoQtd} un. <span className="text-sm text-muted-foreground font-normal">({formatCurrency(resumo.devolvidoValor)})</span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Cancelamentos</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {resumo.canceladoQtd} un. <span className="text-sm text-muted-foreground font-normal">({formatCurrency(resumo.canceladoValor)})</span>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma venda lançada ainda.</p>
          </div>
        ) : (
          pedidos.map((p) => (
            <PedidoItem key={p.id} pedido={p} onAlterarStatus={(status) => alterarStatusPedido(p, status)} onExcluir={() => excluirPedido(p)} />
          ))
        )}
      </div>

      <NovoPedidoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produtos={produtos}
        locais={locais}
        estoque={estoque}
        precosPorCanal={precosPorCanal}
        onSaved={carregar}
      />
    </div>
  )
}
