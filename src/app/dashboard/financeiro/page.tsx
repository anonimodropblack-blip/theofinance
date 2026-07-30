'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ArrowLeftRight, Loader2, Wallet } from 'lucide-react'
import { LancamentoDialog } from '@/components/financeiro/lancamento-dialog'
import { LancamentoItem } from '@/components/financeiro/lancamento-item'
import { TransferenciaDialog } from '@/components/financeiro/transferencia-dialog'
import { formatCurrency, saldoPorConta, type LancamentoComCaixinha } from '@/lib/financeiro'
import { toast } from 'sonner'
import type { Caixinha, LancamentoFinanceiro } from '@/types'

export default function FinanceiroPage() {
  const supabase = useMemo(() => createClient(), [])
  const [lancamentos, setLancamentos] = useState<LancamentoComCaixinha[]>([])
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transferenciaOpen, setTransferenciaOpen] = useState(false)
  const [editando, setEditando] = useState<LancamentoFinanceiro | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: lancs }, { data: cxs }] = await Promise.all([
      supabase
        .from('lancamentos_financeiros')
        .select('*, caixinha:caixinha_id(nome)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('caixinhas').select('*').eq('ativo', true).order('ordem'),
    ])
    setLancamentos((lancs ?? []) as unknown as LancamentoComCaixinha[])
    setCaixinhas((cxs ?? []) as Caixinha[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const saldo = useMemo(() => saldoPorConta(lancamentos), [lancamentos])

  function abrirNovo() {
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(l: LancamentoFinanceiro) {
    setEditando(l)
    setDialogOpen(true)
  }

  async function excluirLancamento(l: LancamentoFinanceiro) {
    if (!window.confirm('Excluir esse lançamento? Essa ação não pode ser desfeita.')) return
    const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', l.id)
    if (error) {
      toast.error('Erro ao excluir lançamento.')
      return
    }
    toast.success('Lançamento excluído')
    carregar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTransferenciaOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" />
            Transferir entre contas
          </Button>
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Saldo Operacional</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(saldo.operacional)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Saldo Reserva/CDB</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(saldo.reserva)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(saldo.operacional + saldo.reserva)}</CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Wallet className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhum lançamento registrado ainda.</p>
          </div>
        ) : (
          lancamentos.map((l) => (
            <LancamentoItem key={l.id} lancamento={l} onEdit={() => abrirEdicao(l)} onDelete={() => excluirLancamento(l)} />
          ))
        )}
      </div>

      <LancamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caixinhas={caixinhas}
        lancamento={editando}
        onSaved={carregar}
      />
      <TransferenciaDialog open={transferenciaOpen} onOpenChange={setTransferenciaOpen} onSaved={carregar} />
    </div>
  )
}
