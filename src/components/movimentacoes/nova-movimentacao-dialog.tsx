'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ajustarEstoque } from '@/lib/estoque'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProdutoAutocomplete } from '@/components/produtos/produto-autocomplete'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import type { LocalEstoque, Produto } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  locais: LocalEstoque[]
  onSaved: () => void
  produtoInicial?: Produto | null
}

export function NovaMovimentacaoDialog({ open, onOpenChange, produtos, locais, onSaved, produtoInicial = null }: Props) {
  const [supabase] = useState(() => createClient())
  const [tipo, setTipo] = useState<'envio' | 'ajuste'>('envio')
  const [produto, setProduto] = useState<Produto | null>(null)
  const [origemId, setOrigemId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [localId, setLocalId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [quantidadeCaixas, setQuantidadeCaixas] = useState('')
  const [codigoReferencia, setCodigoReferencia] = useState('')
  const [motorista, setMotorista] = useState('')
  const [custoFrete, setCustoFrete] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setTipo('envio')
    setProduto(produtoInicial)
    setOrigemId(locais.find((l) => l.tipo === 'proprio')?.id ?? '')
    setDestinoId('')
    setLocalId('')
    setQuantidade('')
    setObservacao('')
    setQuantidadeCaixas('')
    setCodigoReferencia('')
    setMotorista('')
    setCustoFrete('')
  }, [open, locais, produtoInicial])

  async function salvar() {
    if (!produto || !quantidade || Number(quantidade) === 0) {
      toast.error('Selecione o produto e informe a quantidade.')
      return
    }
    if (tipo === 'envio' && Number(quantidade) < 0) {
      toast.error('Quantidade de envio deve ser positiva.')
      return
    }
    if (tipo === 'envio' && (!origemId || !destinoId)) {
      toast.error('Selecione origem e destino.')
      return
    }
    if (tipo === 'ajuste' && !localId) {
      toast.error('Selecione o local.')
      return
    }

    setSalvando(true)
    const qtd = Number(quantidade)

    if (tipo === 'envio') {
      const { error } = await supabase.from('movimentacoes').insert({
        produto_id: produto.id,
        tipo: 'envio',
        quantidade: -qtd,
        origem_local_id: origemId,
        destino_local_id: destinoId,
        observacao: observacao.trim() || null,
        quantidade_caixas: quantidadeCaixas ? Number(quantidadeCaixas) : null,
        codigo_referencia: codigoReferencia.trim() || null,
        motorista: motorista.trim() || null,
        custo_frete: custoFrete ? Number(custoFrete.replace(',', '.')) : null,
      })
      if (error) { toast.error('Erro ao salvar movimentação.'); setSalvando(false); return }
      await ajustarEstoque(supabase, produto.id, origemId, -qtd)
      await ajustarEstoque(supabase, produto.id, destinoId, qtd)
    } else {
      const { error } = await supabase.from('movimentacoes').insert({
        produto_id: produto.id,
        tipo: 'ajuste',
        quantidade: qtd,
        origem_local_id: localId,
        observacao: observacao.trim() || null,
      })
      if (error) { toast.error('Erro ao salvar movimentação.'); setSalvando(false); return }
      await ajustarEstoque(supabase, produto.id, localId, qtd)
    }

    setSalvando(false)
    toast.success('Movimentação registrada')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as 'envio' | 'ajuste')}
              items={{ envio: 'Envio para marketplace', ajuste: 'Ajuste manual' }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="envio">Envio para marketplace</SelectItem>
                <SelectItem value="ajuste">Ajuste manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Produto</Label>
            {produto ? (
              <div className="h-8 flex items-center justify-between px-3 rounded-md border border-border bg-muted text-sm">
                {produto.nome}
                <button type="button" onClick={() => setProduto(null)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <ProdutoAutocomplete produtos={produtos} onSelect={setProduto} />
            )}
          </div>

          {tipo === 'envio' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select
                  value={origemId}
                  onValueChange={(v) => setOrigemId(v ?? '')}
                  items={Object.fromEntries(locais.map((l) => [l.id, l.nome]))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locais.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Select
                  value={destinoId}
                  onValueChange={(v) => setDestinoId(v ?? '')}
                  items={Object.fromEntries(locais.filter((l) => l.id !== origemId).map((l) => [l.id, l.nome]))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locais.filter((l) => l.id !== origemId).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Local</Label>
              <Select
                value={localId}
                onValueChange={(v) => setLocalId(v ?? '')}
                items={Object.fromEntries(locais.map((l) => [l.id, l.nome]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {locais.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{tipo === 'ajuste' ? 'Quantidade (use negativo pra remover)' : 'Quantidade'}</Label>
            <Input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          {tipo === 'envio' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Qtd. de caixas</Label>
                  <Input
                    type="number"
                    value={quantidadeCaixas}
                    onChange={(e) => setQuantidadeCaixas(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código de referência</Label>
                  <Input
                    placeholder="Seu código interno do envio"
                    value={codigoReferencia}
                    onChange={(e) => setCodigoReferencia(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Motorista</Label>
                  <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Custo do frete (R$)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={custoFrete}
                    onChange={(e) => setCustoFrete(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
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
