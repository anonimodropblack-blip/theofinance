'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { formatCurrency, saldoDevedor } from '@/lib/contas-pagar'
import { confirmarEstoqueSeQuitado } from '@/lib/pedido-compra'
import type { ContaPagar } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conta: ContaPagar | null
  onSaved: () => void
}

export function RegistrarPagamentoDialog({ open, onOpenChange, conta, onSaved }: Props) {
  const [supabase] = useState(() => createClient())
  const [valor, setValor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !conta) return
    setValor(String(saldoDevedor(conta)))
  }, [open, conta])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!conta) return
    const valorNumero = Number(valor.replace(',', '.'))
    if (!valorNumero || valorNumero <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    const saldo = saldoDevedor(conta)
    const valorAplicado = Math.min(valorNumero, saldo)
    const novoValorPago = conta.valor_pago + valorAplicado
    setSaving(true)
    const { error } = await supabase
      .from('contas_pagar')
      .update({
        valor_pago: novoValorPago,
        pago_em: novoValorPago >= conta.valor_total ? new Date().toISOString() : null,
      })
      .eq('id', conta.id)
    setSaving(false)
    if (error) {
      toast.error('Erro ao registrar pagamento.')
      return
    }
    if (novoValorPago >= conta.valor_total) {
      await confirmarEstoqueSeQuitado(supabase, { ...conta, valor_pago: novoValorPago })
    }
    toast.success(novoValorPago >= conta.valor_total ? 'Conta quitada' : 'Pagamento parcial registrado')
    onOpenChange(false)
    onSaved()
  }

  if (!conta) return null
  const saldo = saldoDevedor(conta)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {conta.descricao} — saldo devedor {formatCurrency(saldo)}
          </p>
          <div className="space-y-2">
            <Label htmlFor="valor-pagamento">Valor pago agora (R$)</Label>
            <Input id="valor-pagamento" inputMode="decimal" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} />
            <p className="text-xs text-muted-foreground">Preenchido com o saldo total — edite pra registrar um pagamento parcial.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
