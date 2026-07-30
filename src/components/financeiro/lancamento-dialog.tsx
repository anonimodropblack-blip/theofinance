'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Caixinha, LancamentoFinanceiro } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  caixinhas: Caixinha[]
  onSaved: () => void
  lancamento?: LancamentoFinanceiro | null
  valorInicial?: number
  retiradaInicial?: boolean
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function LancamentoDialog({ open, onOpenChange, caixinhas, onSaved, lancamento = null, valorInicial, retiradaInicial = false }: Props) {
  const [supabase] = useState(() => createClient())
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida')
  const [conta, setConta] = useState<'operacional' | 'reserva'>('operacional')
  const [retirada, setRetirada] = useState(false)
  const [caixinhaId, setCaixinhaId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    if (lancamento) {
      setTipo(lancamento.tipo)
      setConta(lancamento.conta)
      setRetirada(lancamento.retirada)
      setCaixinhaId(lancamento.caixinha_id ?? '')
      setCategoria(lancamento.categoria ?? '')
      setValor(String(lancamento.valor))
      setData(lancamento.data)
      setDescricao(lancamento.descricao ?? '')
    } else {
      setTipo('saida')
      setConta('operacional')
      setRetirada(retiradaInicial)
      setCaixinhaId('')
      setCategoria(retiradaInicial ? 'Retirada' : '')
      setValor(valorInicial != null ? String(valorInicial) : '')
      setData(hojeISO())
      setDescricao('')
    }
  }, [open, lancamento, valorInicial, retiradaInicial])

  async function salvar() {
    const valorNumero = Number(valor.replace(',', '.'))
    if (!valorNumero || valorNumero <= 0) {
      toast.error('Informe um valor maior que zero.')
      return
    }
    const payload = {
      tipo,
      conta,
      retirada: tipo === 'saida' ? retirada : false,
      caixinha_id: tipo === 'saida' && caixinhaId ? caixinhaId : null,
      categoria: categoria.trim() || null,
      valor: valorNumero,
      data,
      descricao: descricao.trim() || null,
    }
    setSalvando(true)
    const { error } = lancamento
      ? await supabase.from('lancamentos_financeiros').update(payload).eq('id', lancamento.id)
      : await supabase.from('lancamentos_financeiros').insert(payload)
    setSalvando(false)
    if (error) {
      toast.error('Erro ao salvar lançamento.')
      return
    }
    toast.success(lancamento ? 'Lançamento atualizado' : 'Lançamento registrado')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lancamento ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo((v ?? 'saida') as 'entrada' | 'saida')}
                items={{ entrada: 'Entrada (recebi)', saida: 'Saída (gastei/tirei)' }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (recebi)</SelectItem>
                  <SelectItem value="saida">Saída (gastei/tirei)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select
                value={conta}
                onValueChange={(v) => setConta((v ?? 'operacional') as 'operacional' | 'reserva')}
                items={{ operacional: 'Operacional', reserva: 'Reserva/CDB' }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="reserva">Reserva/CDB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {tipo === 'saida' && (
            <div className="flex items-center gap-2">
              <Checkbox id="retirada" checked={retirada} onCheckedChange={(v) => setRetirada(v === true)} />
              <Label htmlFor="retirada" className="font-normal">É retirada do meu salário?</Label>
            </div>
          )}

          {tipo === 'saida' && caixinhas.length > 0 && (
            <div className="space-y-2">
              <Label>Vincular a uma caixinha (opcional)</Label>
              <Select
                value={caixinhaId}
                onValueChange={(v) => setCaixinhaId(v ?? '')}
                items={{ '': 'Nenhuma', ...Object.fromEntries(caixinhas.map((c) => [c.id, c.nome])) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {caixinhas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Categoria (opcional)</Label>
            <Input placeholder="ex: Venda Shopee, conta de luz..." value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
