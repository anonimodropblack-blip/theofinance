'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ajustarEstoque } from '@/lib/estoque'
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
import { ProdutoAutocomplete } from '@/components/produtos/produto-autocomplete'
import { MaisOpcoes } from '@/components/ui/mais-opcoes'
import { toast } from 'sonner'
import { Loader2, X, Package, Boxes } from 'lucide-react'
import type { LocalEstoque, Lote, Produto } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  locais: LocalEstoque[]
  onSaved: () => void
  produtoInicial?: Produto | null
}

type ItemLoteParaMover = {
  produto: Produto
  disponivel: number
  mover: string
  incluir: boolean
}

export function NovaMovimentacaoDialog({ open, onOpenChange, produtos, locais, onSaved, produtoInicial = null }: Props) {
  const [supabase] = useState(() => createClient())
  const [tipo, setTipo] = useState<'envio' | 'ajuste'>('envio')
  const [modoLote, setModoLote] = useState(false)
  const [produto, setProduto] = useState<Produto | null>(null)
  const [lotesAtivos, setLotesAtivos] = useState<Lote[]>([])
  const [loteId, setLoteId] = useState('')
  const [itensLote, setItensLote] = useState<ItemLoteParaMover[]>([])
  const [carregandoItensLote, setCarregandoItensLote] = useState(false)
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
    setModoLote(false)
    setProduto(produtoInicial)
    setLoteId('')
    setItensLote([])
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

  useEffect(() => {
    if (!open) return
    supabase.from('lotes').select('*').eq('ativo', true).order('data', { ascending: false }).then(({ data }) => {
      setLotesAtivos((data ?? []) as Lote[])
    })
  }, [open, supabase])

  useEffect(() => {
    if (!modoLote || !loteId) { setItensLote([]); return }
    let cancelado = false
    setCarregandoItensLote(true)
    ;(async () => {
      const { data: itens } = await supabase
        .from('lote_itens')
        .select('*, produto:produtos(*)')
        .eq('lote_id', loteId)
      const produtoIds = (itens ?? []).map((i) => i.produto_id)
      const { data: est } = produtoIds.length > 0 && origemId
        ? await supabase.from('estoque').select('*').eq('local_id', origemId).in('produto_id', produtoIds)
        : { data: [] }
      if (cancelado) return
      const disponivelPorProduto = new Map((est ?? []).map((e) => [e.produto_id, e.quantidade as number]))
      setItensLote(
        (itens ?? []).map((i) => {
          const disponivel = disponivelPorProduto.get(i.produto_id) ?? 0
          return {
            produto: i.produto as Produto,
            disponivel,
            mover: String(Math.max(disponivel, 0)),
            incluir: disponivel > 0,
          }
        })
      )
      setCarregandoItensLote(false)
    })()
    return () => { cancelado = true }
  }, [modoLote, loteId, origemId, supabase])

  async function salvarLoteInteiro() {
    if (!loteId) { toast.error('Selecione o lote.'); return }
    if (!origemId || !destinoId) { toast.error('Selecione origem e destino.'); return }
    const selecionados = itensLote.filter((i) => i.incluir && Number(i.mover) > 0)
    if (selecionados.length === 0) { toast.error('Selecione ao menos um produto pra mover.'); return }
    for (const i of selecionados) {
      if (Number(i.mover) > i.disponivel) {
        toast.error(`Quantidade de "${i.produto.nome}" maior que o disponível (${i.disponivel}).`)
        return
      }
    }

    setSalvando(true)
    for (const i of selecionados) {
      const qtd = Number(i.mover)
      const { error } = await supabase.from('movimentacoes').insert({
        produto_id: i.produto.id,
        tipo: 'envio',
        quantidade: -qtd,
        origem_local_id: origemId,
        destino_local_id: destinoId,
        lote_id: loteId,
        observacao: observacao.trim() || null,
        quantidade_caixas: quantidadeCaixas ? Number(quantidadeCaixas) : null,
        codigo_referencia: codigoReferencia.trim() || null,
        motorista: motorista.trim() || null,
        custo_frete: custoFrete ? Number(custoFrete.replace(',', '.')) : null,
      })
      if (error) { toast.error(`Erro ao mover "${i.produto.nome}".`); setSalvando(false); return }
      await ajustarEstoque(supabase, i.produto.id, origemId, -qtd)
      await ajustarEstoque(supabase, i.produto.id, destinoId, qtd)
    }
    setSalvando(false)
    toast.success(`${selecionados.length} produto${selecionados.length === 1 ? '' : 's'} movido${selecionados.length === 1 ? '' : 's'}`)
    onOpenChange(false)
    onSaved()
  }

  async function salvar() {
    if (modoLote) { await salvarLoteInteiro(); return }

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
              onValueChange={(v) => { setTipo(v as 'envio' | 'ajuste'); if (v === 'ajuste') setModoLote(false) }}
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

          {tipo === 'envio' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModoLote(false)}
                className={`h-8 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${!modoLote ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                <Package className="h-3.5 w-3.5" /> Produto
              </button>
              <button
                type="button"
                onClick={() => setModoLote(true)}
                className={`h-8 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${modoLote ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                <Boxes className="h-3.5 w-3.5" /> Lote inteiro
              </button>
            </div>
          )}

          {modoLote ? (
            <div className="space-y-2">
              <Label>Lote</Label>
              <Select
                value={loteId}
                onValueChange={(v) => setLoteId(v ?? '')}
                items={Object.fromEntries(lotesAtivos.map((l) => [l.id, `${l.codigo} · ${l.fornecedor}`]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {lotesAtivos.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.codigo} · {l.fornecedor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
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
          )}

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

          {modoLote ? (
            <div className="space-y-2">
              <Label>Produtos do lote</Label>
              <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
                {!loteId ? (
                  <p className="text-sm text-muted-foreground p-3">Selecione um lote acima.</p>
                ) : carregandoItensLote ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : itensLote.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">Este lote não tem produtos.</p>
                ) : (
                  itensLote.map((item, index) => (
                    <div key={item.produto.id} className="flex items-center gap-2 p-2.5">
                      <Checkbox
                        checked={item.incluir}
                        onCheckedChange={(v) => setItensLote((prev) => prev.map((it, i) => i === index ? { ...it, incluir: !!v } : it))}
                        disabled={item.disponivel <= 0}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.produto.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.disponivel} disponível na origem</p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={item.disponivel}
                        className="w-20 shrink-0"
                        value={item.mover}
                        disabled={!item.incluir}
                        onChange={(e) => setItensLote((prev) => prev.map((it, i) => i === index ? { ...it, mover: e.target.value } : it))}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{tipo === 'ajuste' ? 'Quantidade (use negativo pra remover)' : 'Quantidade'}</Label>
              <Input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          )}

          {tipo === 'envio' && (
            <MaisOpcoes>
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
            </MaisOpcoes>
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
