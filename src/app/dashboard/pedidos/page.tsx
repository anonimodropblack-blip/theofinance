'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, ShoppingCart } from 'lucide-react'
import { NovoPedidoDialog } from '@/components/pedidos/novo-pedido-dialog'
import { PedidoItem } from '@/components/pedidos/pedido-item'
import type { PedidoCompleto } from '@/lib/pedidos'
import type { Estoque, LocalEstoque, Produto } from '@/types'

export default function PedidosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [estoque, setEstoque] = useState<Estoque[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: peds }, { data: prods }, { data: locs }, { data: est }] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, produto:produtos(*), local:local_id(*)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
      supabase.from('estoque').select('*'),
    ])
    setPedidos((peds ?? []) as unknown as PedidoCompleto[])
    setProdutos((prods ?? []) as Produto[])
    setLocais((locs ?? []) as LocalEstoque[])
    setEstoque((est ?? []) as Estoque[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhum pedido lançado ainda.</p>
          </div>
        ) : (
          pedidos.map((p) => <PedidoItem key={p.id} pedido={p} />)
        )}
      </div>

      <NovoPedidoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produtos={produtos}
        locais={locais}
        estoque={estoque}
        onSaved={carregar}
      />
    </div>
  )
}
