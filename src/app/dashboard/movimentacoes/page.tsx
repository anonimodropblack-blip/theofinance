'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, Tags } from 'lucide-react'
import { NovaMovimentacaoDialog } from '@/components/movimentacoes/nova-movimentacao-dialog'
import { MovimentacaoItem } from '@/components/movimentacoes/movimentacao-item'
import type { MovimentacaoCompleta } from '@/lib/movimentacoes'
import type { LocalEstoque, Produto } from '@/types'

export default function MovimentacoesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCompleta[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: movs }, { data: prods }, { data: locs }] = await Promise.all([
      supabase
        .from('movimentacoes')
        .select('*, produto:produtos(*), origem:origem_local_id(id, nome), destino:destino_local_id(id, nome)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
    ])
    setMovimentacoes((movs ?? []) as unknown as MovimentacaoCompleta[])
    setProdutos((prods ?? []) as Produto[])
    setLocais((locs ?? []) as LocalEstoque[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Movimentações</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Tags className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma movimentação registrada ainda.</p>
          </div>
        ) : (
          movimentacoes.map((m) => <MovimentacaoItem key={m.id} movimentacao={m} />)
        )}
      </div>

      <NovaMovimentacaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produtos={produtos}
        locais={locais}
        onSaved={carregar}
      />
    </div>
  )
}
