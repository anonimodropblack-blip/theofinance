'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MovimentacaoItem } from '@/components/movimentacoes/movimentacao-item'
import { NovaMovimentacaoDialog } from '@/components/movimentacoes/nova-movimentacao-dialog'
import { Loader2, Plus, Tags } from 'lucide-react'
import type { MovimentacaoCompleta } from '@/lib/movimentacoes'
import type { LocalEstoque, Produto } from '@/types'

type Props = {
  produto: Produto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  locais: LocalEstoque[]
  produtos: Produto[]
  saldoPorLocal: Record<string, number>
  onMovimentacaoRegistrada: () => void
}

export function ProdutoDetalheSheet({ produto, open, onOpenChange, locais, produtos, saldoPorLocal, onMovimentacaoRegistrada }: Props) {
  const [supabase] = useState(() => createClient())
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [novaOpen, setNovaOpen] = useState(false)

  const carregarHistorico = useCallback(async () => {
    if (!produto) return
    setLoading(true)
    const { data } = await supabase
      .from('movimentacoes')
      .select('*, produto:produtos(*), origem:origem_local_id(id, nome), destino:destino_local_id(id, nome)')
      .eq('produto_id', produto.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    setMovimentacoes((data ?? []) as unknown as MovimentacaoCompleta[])
    setLoading(false)
  }, [supabase, produto])

  useEffect(() => { if (open) carregarHistorico() }, [open, carregarHistorico])

  async function aoSalvarMovimentacao() {
    await carregarHistorico()
    onMovimentacaoRegistrada()
  }

  const total = Object.values(saldoPorLocal).reduce((s, q) => s + q, 0)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3 pr-8">
              <SheetTitle>{produto?.nome}</SheetTitle>
              <Button size="sm" onClick={() => setNovaOpen(true)}>
                <Plus className="h-4 w-4" />
                Nova
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-lg border border-border divide-y divide-border">
              {locais.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{l.nome}</span>
                  <span className="font-medium">{saldoPorLocal[l.id] ?? 0}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                <span>Total</span>
                <span>{total}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Histórico de movimentações</p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : movimentacoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <Tags className="h-6 w-6 mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma movimentação registrada ainda.</p>
                  </div>
                ) : (
                  movimentacoes.map((m) => (
                    <MovimentacaoItem key={m.id} movimentacao={m} mostrarProduto={false} />
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {produto && (
        <NovaMovimentacaoDialog
          open={novaOpen}
          onOpenChange={setNovaOpen}
          produtos={produtos}
          locais={locais}
          produtoInicial={produto}
          onSaved={aoSalvarMovimentacao}
        />
      )}
    </>
  )
}
