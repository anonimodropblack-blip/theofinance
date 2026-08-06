'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { somarDias } from '@/lib/contas-pagar'
import type { Lote } from '@/types'

type LoteInicial = { id: string; codigo: string; fornecedor: string; valorTotal: number }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lotes: Lote[]
  loteInicial?: LoteInicial | null
  onSaved: () => void
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function NovaContaPagarDialog({ open, onOpenChange, lotes, loteInicial, onSaved }: Props) {
  const [supabase] = useState(() => createClient())
  const [descricao, setDescricao] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [loteId, setLoteId] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [dataCompra, setDataCompra] = useState('')
  const [modoPrazo, setModoPrazo] = useState<'dias' | 'data'>('dias')
  const [prazoDias, setPrazoDias] = useState('30')
  const [dataVencimento, setDataVencimento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [parcelado, setParcelado] = useState(false)
  const [numParcelas, setNumParcelas] = useState('3')
  const [intervaloDias, setIntervaloDias] = useState('30')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDescricao(loteInicial ? `Pedido ${loteInicial.codigo}` : '')
    setFornecedor(loteInicial?.fornecedor ?? '')
    setLoteId(loteInicial?.id ?? '')
    setValorTotal(loteInicial ? String(loteInicial.valorTotal) : '')
    setDataCompra(hojeISO())
    setModoPrazo('dias')
    setPrazoDias('30')
    setDataVencimento('')
    setObservacao('')
    setParcelado(false)
    setNumParcelas('3')
    setIntervaloDias('30')
  }, [open])

  function selecionarLote(id: string) {
    setLoteId(id)
    const lote = lotes.find((l) => l.id === id)
    if (lote) {
      setFornecedor((atual) => atual || lote.fornecedor)
      setDescricao((atual) => atual || `Lote ${lote.codigo}`)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = Number(valorTotal.replace(',', '.'))
    if (!descricao.trim() || !valor || valor <= 0 || !dataCompra) {
      toast.error('Preencha descrição, valor e data da compra.')
      return
    }

    if (parcelado) {
      const n = Number(numParcelas)
      const intervalo = Number(intervaloDias)
      if (!n || n < 2) {
        toast.error('Informe pelo menos 2 parcelas.')
        return
      }
      if (!intervalo || intervalo <= 0) {
        toast.error('Informe o intervalo entre parcelas em dias.')
        return
      }
      const valorParcela = Math.round((valor / n) * 100) / 100
      const grupoId = crypto.randomUUID()
      const linhas = Array.from({ length: n }, (_, i) => {
        const numero = i + 1
        return {
          descricao: descricao.trim(),
          fornecedor: fornecedor.trim() || null,
          lote_id: loteId || null,
          valor_total: numero === n ? Math.round((valor - valorParcela * (n - 1)) * 100) / 100 : valorParcela,
          data_compra: dataCompra,
          data_vencimento: somarDias(dataCompra, intervalo * numero),
          observacao: observacao.trim() || null,
          grupo_parcelamento_id: grupoId,
          numero_parcela: numero,
          total_parcelas: n,
        }
      })
      setSaving(true)
      const { error } = await supabase.from('contas_pagar').insert(linhas)
      setSaving(false)
      if (error) {
        toast.error('Erro ao salvar as parcelas.')
        return
      }
      toast.success(`${n} parcelas registradas`)
      onOpenChange(false)
      onSaved()
      return
    }

    const vencimento = modoPrazo === 'dias'
      ? somarDias(dataCompra, Number(prazoDias) || 0)
      : dataVencimento
    if (!vencimento) {
      toast.error('Informe o prazo em dias ou a data de vencimento.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('contas_pagar').insert({
      descricao: descricao.trim(),
      fornecedor: fornecedor.trim() || null,
      lote_id: loteId || null,
      valor_total: valor,
      data_compra: dataCompra,
      data_vencimento: vencimento,
      observacao: observacao.trim() || null,
    })
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar conta a pagar.')
      return
    }
    toast.success('Conta a pagar registrada')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova conta a pagar</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Lote (opcional)</Label>
            <Select
              value={loteId}
              onValueChange={(v) => selecionarLote(v ?? '')}
              items={{ '': 'Nenhum', ...Object.fromEntries(lotes.map((l) => [l.id, `${l.codigo} — ${l.fornecedor}`])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.codigo} — {l.fornecedor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao-cp">Descrição</Label>
            <Input id="descricao-cp" value={descricao} onChange={(e) => setDescricao(e.target.value)} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fornecedor-cp">Fornecedor</Label>
              <Input id="fornecedor-cp" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor-cp">Valor total (R$)</Label>
              <Input id="valor-cp" inputMode="decimal" placeholder="0,00" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-compra-cp">Data da compra</Label>
            <Input id="data-compra-cp" type="date" className="max-w-[180px]" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} required />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="parcelado-cp" checked={parcelado} onCheckedChange={(v) => setParcelado(v === true)} />
            <Label htmlFor="parcelado-cp" className="font-normal">Parcelar em várias vezes</Label>
          </div>

          {parcelado ? (
            <div className="space-y-2">
              <Label>Parcelamento</Label>
              <div className="flex items-center gap-2">
                <Input inputMode="numeric" className="w-20" placeholder="3" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
                <span className="text-sm text-muted-foreground shrink-0">parcelas, a cada</span>
                <Input inputMode="numeric" className="w-20" placeholder="30" value={intervaloDias} onChange={(e) => setIntervaloDias(e.target.value)} />
                <span className="text-sm text-muted-foreground shrink-0">dias</span>
              </div>
              {dataCompra && Number(numParcelas) > 0 && Number(intervaloDias) > 0 && (
                <p className="text-xs text-muted-foreground">
                  1ª parcela vence em {somarDias(dataCompra, Number(intervaloDias)).split('-').reverse().join('/')}, última em {somarDias(dataCompra, Number(intervaloDias) * Number(numParcelas)).split('-').reverse().join('/')}.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Prazo de pagamento</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={modoPrazo}
                  onValueChange={(v) => setModoPrazo((v as 'dias' | 'data') ?? 'dias')}
                  items={{ dias: 'Dias de prazo', data: 'Data exata' }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dias">Dias de prazo</SelectItem>
                    <SelectItem value="data">Data exata</SelectItem>
                  </SelectContent>
                </Select>
                {modoPrazo === 'dias' ? (
                  <Input inputMode="numeric" className="w-24" placeholder="30" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} />
                ) : (
                  <Input type="date" className="max-w-[180px]" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                )}
              </div>
              {modoPrazo === 'dias' && dataCompra && prazoDias && (
                <p className="text-xs text-muted-foreground">Vence em {somarDias(dataCompra, Number(prazoDias) || 0).split('-').reverse().join('/')}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs-cp">Observação (opcional)</Label>
            <Textarea id="obs-cp" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
