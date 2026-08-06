'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Loader2, Receipt, MoreHorizontal } from 'lucide-react'
import { NovaContaPagarDialog } from '@/components/financeiro/nova-conta-pagar-dialog'
import { RegistrarPagamentoDialog } from '@/components/financeiro/registrar-pagamento-dialog'
import {
  diasEntre,
  formatCurrency,
  formatDataCurta,
  saldoDevedor,
  statusContaPagar,
  STATUS_LABEL,
  type StatusContaPagar,
} from '@/lib/contas-pagar'
import { COR_ALERTA, COR_NEGATIVO, COR_POSITIVO } from '@/lib/cores'
import { confirmarEstoqueSeQuitado } from '@/lib/pedido-compra'
import { toast } from 'sonner'
import type { ContaPagar, Lote } from '@/types'

const COR_STATUS: Record<StatusContaPagar, string> = {
  pago: COR_POSITIVO,
  vencido: COR_NEGATIVO,
  vencendo: COR_ALERTA,
  parcial: COR_ALERTA,
  pendente: 'text-muted-foreground',
}

const BADGE_VARIANT: Record<StatusContaPagar, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pago: 'secondary',
  vencido: 'destructive',
  vencendo: 'default',
  parcial: 'outline',
  pendente: 'outline',
}

export default function ContasAPagarPage() {
  const supabase = useMemo(() => createClient(), [])
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pagamentoContaId, setPagamentoContaId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: cts }, { data: lts }] = await Promise.all([
      supabase.from('contas_pagar').select('*').order('data_vencimento'),
      supabase.from('lotes').select('*').eq('ativo', true).order('data', { ascending: false }),
    ])
    setContas((cts ?? []) as ContaPagar[])
    setLotes((lts ?? []) as Lote[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const resumo = useMemo(() => {
    let pendenteValor = 0
    let vencendoQtd = 0
    let vencendoValor = 0
    let vencidoQtd = 0
    let vencidoValor = 0
    for (const c of contas) {
      const status = statusContaPagar(c)
      const saldo = saldoDevedor(c)
      if (status === 'pago') continue
      pendenteValor += saldo
      if (status === 'vencendo') { vencendoQtd++; vencendoValor += saldo }
      if (status === 'vencido') { vencidoQtd++; vencidoValor += saldo }
    }
    return { pendenteValor, vencendoQtd, vencendoValor, vencidoQtd, vencidoValor }
  }, [contas])

  const contaPagamento = contas.find((c) => c.id === pagamentoContaId) ?? null

  async function marcarComoPago(conta: ContaPagar) {
    const { error } = await supabase
      .from('contas_pagar')
      .update({ valor_pago: conta.valor_total, pago_em: new Date().toISOString() })
      .eq('id', conta.id)
    if (error) {
      toast.error('Erro ao marcar como pago.')
      return
    }
    await confirmarEstoqueSeQuitado(supabase, { ...conta, valor_pago: conta.valor_total })
    toast.success('Conta quitada')
    carregar()
  }

  async function excluirConta(conta: ContaPagar) {
    if (!window.confirm(`Excluir "${conta.descricao}"?`)) return
    const { error } = await supabase.from('contas_pagar').delete().eq('id', conta.id)
    if (error) {
      toast.error('Erro ao excluir.')
      return
    }
    toast.success('Conta excluída')
    carregar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Contas a Pagar</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Total em aberto</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(resumo.pendenteValor)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Vencendo (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className={`text-lg font-semibold ${COR_ALERTA}`}>
            {resumo.vencendoQtd} · {formatCurrency(resumo.vencendoValor)}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Vencidas</CardTitle>
          </CardHeader>
          <CardContent className={`text-lg font-semibold ${COR_NEGATIVO}`}>
            {resumo.vencidoQtd} · {formatCurrency(resumo.vencidoValor)}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Receipt className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma conta a pagar registrada ainda.</p>
          </div>
        ) : (
          contas.map((c) => {
            const status = statusContaPagar(c)
            const saldo = saldoDevedor(c)
            const dias = diasEntre(c.data_vencimento)
            return (
              <div key={c.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 w-12 ${COR_STATUS[status]}`}>{formatDataCurta(c.data_vencimento)}</span>
                  <span className="font-medium truncate">{c.descricao}</span>
                  {c.numero_parcela != null && c.total_parcelas != null && (
                    <Badge variant="outline" className="shrink-0">Parcela {c.numero_parcela} de {c.total_parcelas}</Badge>
                  )}
                  {c.fornecedor && <span className="text-xs text-muted-foreground shrink-0">{c.fornecedor}</span>}
                  <Badge variant={BADGE_VARIANT[status]} className="shrink-0">
                    {STATUS_LABEL[status]}
                    {status === 'vencendo' && ` · ${dias}d`}
                    {status === 'vencido' && ` · ${Math.abs(dias)}d atrás`}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(c.valor_total)}</div>
                    {c.valor_pago > 0 && status !== 'pago' && (
                      <div className="text-xs text-muted-foreground">falta {formatCurrency(saldo)}</div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {status !== 'pago' && (
                        <>
                          <DropdownMenuItem onClick={() => marcarComoPago(c)}>Marcar como pago (total)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPagamentoContaId(c.id)}>Registrar pagamento parcial</DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => excluirConta(c)} className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })
        )}
      </div>

      <NovaContaPagarDialog open={dialogOpen} onOpenChange={setDialogOpen} lotes={lotes} onSaved={carregar} />
      <RegistrarPagamentoDialog
        open={pagamentoContaId != null}
        onOpenChange={(open) => { if (!open) setPagamentoContaId(null) }}
        conta={contaPagamento}
        onSaved={carregar}
      />
    </div>
  )
}
