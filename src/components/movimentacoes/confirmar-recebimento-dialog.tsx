'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { MovimentacaoCompleta } from '@/lib/movimentacoes'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  movimentacao: MovimentacaoCompleta | null
  onSaved: () => void
}

export function ConfirmarRecebimentoDialog({ open, onOpenChange, movimentacao, onSaved }: Props) {
  const [supabase] = useState(() => createClient())
  const [qtdRecebida, setQtdRecebida] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const qtdEnviada = movimentacao ? Math.abs(movimentacao.quantidade) : 0
  const temDiferenca = qtdRecebida !== '' && Number(qtdRecebida) < qtdEnviada

  useEffect(() => {
    if (!open || !movimentacao) return
    setQtdRecebida(String(Math.abs(movimentacao.quantidade)))
    setMotivo('')
  }, [open, movimentacao])

  async function salvar() {
    if (!movimentacao) return
    const qtd = Number(qtdRecebida)
    if (qtdRecebida === '' || qtd < 0) {
      toast.error('Informe a quantidade recebida.')
      return
    }
    setSalvando(true)
    const { error } = await supabase
      .from('movimentacoes')
      .update({ qtd_confirmada: qtd, motivo_diferenca: qtd < qtdEnviada ? motivo.trim() || null : null })
      .eq('id', movimentacao.id)
    setSalvando(false)
    if (error) {
      toast.error('Erro ao confirmar recebimento.')
      return
    }
    toast.success(qtd === qtdEnviada ? 'Recebimento confirmado' : 'Recebimento confirmado com diferença registrada')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar recebimento</DialogTitle>
        </DialogHeader>

        {movimentacao && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{movimentacao.produto?.nome}</p>
              <p className="text-muted-foreground">
                {movimentacao.origem?.nome} → {movimentacao.destino?.nome} · enviado {qtdEnviada}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quantidade recebida</Label>
              <Input
                type="number"
                min={0}
                value={qtdRecebida}
                onChange={(e) => setQtdRecebida(e.target.value)}
              />
            </div>

            {temDiferenca && (
              <div className="space-y-2">
                <Label>Motivo da diferença (opcional)</Label>
                <Textarea
                  placeholder="ex: avaria no transporte, extraviado pela transportadora..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
