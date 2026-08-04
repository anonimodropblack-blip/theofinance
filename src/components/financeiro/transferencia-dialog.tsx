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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const DIRECOES = {
  'operacional->reserva': 'Operacional → Reserva/CDB',
  'reserva->operacional': 'Reserva/CDB → Operacional',
} as const

export function TransferenciaDialog({ open, onOpenChange, onSaved }: Props) {
  const [supabase] = useState(() => createClient())
  const [direcao, setDirecao] = useState<keyof typeof DIRECOES>('operacional->reserva')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setDirecao('operacional->reserva')
    setValor('')
  }, [open])

  async function salvar() {
    const valorNumero = Number(valor.replace(',', '.'))
    if (!valorNumero || valorNumero <= 0) {
      toast.error('Informe um valor maior que zero.')
      return
    }
    const [origem, destino] = direcao.split('->') as ['operacional' | 'reserva', 'operacional' | 'reserva']
    const hoje = new Date().toISOString().slice(0, 10)
    setSalvando(true)

    const { data: categoriaTransferencia } = await supabase.from('categorias_financeiras').select('id').eq('nome', 'Transferência').single()
    const categoria_id = categoriaTransferencia?.id ?? null

    const { error } = await supabase.from('lancamentos_financeiros').insert([
      { tipo: 'saida', conta: origem, valor: valorNumero, data: hoje, categoria_id, descricao: `Transferência para ${destino === 'reserva' ? 'Reserva/CDB' : 'Operacional'}` },
      { tipo: 'entrada', conta: destino, valor: valorNumero, data: hoje, categoria_id, descricao: `Transferência de ${origem === 'reserva' ? 'Reserva/CDB' : 'Operacional'}` },
    ])
    setSalvando(false)
    if (error) {
      toast.error('Erro ao registrar transferência.')
      return
    }
    toast.success('Transferência registrada')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Direção</Label>
            <Select value={direcao} onValueChange={(v) => setDirecao((v ?? 'operacional->reserva') as keyof typeof DIRECOES)} items={DIRECOES}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIRECOES).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
