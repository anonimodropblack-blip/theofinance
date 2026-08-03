'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ajustarEstoque } from '@/lib/estoque'
import { somarVendaMesCanal } from '@/lib/vendas-canal'
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
import { Loader2, X, Package, Boxes, Plus, Trash2 } from 'lucide-react'
import type { Estoque, LocalEstoque, Produto } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  locais: LocalEstoque[]
  estoque: Estoque[]
  onSaved: () => void
}

type ItemPedido = {
  uid: string
  produto: Produto | null
  localId: string
  quantidade: string
  precoUnitario: string
}

function novoItem(localId = ''): ItemPedido {
  return { uid: Math.random().toString(36).slice(2), produto: null, localId, quantidade: '', precoUnitario: '' }
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function NovoPedidoDialog({ open, onOpenChange, produtos, locais, estoque, onSaved }: Props) {
  const [supabase] = useState(() => createClient())
  const [modoMassa, setModoMassa] = useState(false)
  const [itens, setItens] = useState<ItemPedido[]>([novoItem()])
  const [data, setData] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setModoMassa(false)
    setItens([novoItem()])
    setData(hojeISO())
    setObservacao('')
  }, [open])

  function disponivelPara(produtoId: string, localId: string) {
    return estoque.find((e) => e.produto_id === produtoId && e.local_id === localId)?.quantidade ?? 0
  }

  function atualizarItem(uid: string, patch: Partial<ItemPedido>) {
    setItens((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch } : it)))
  }

  function selecionarProduto(uid: string, produto: Produto) {
    atualizarItem(uid, {
      produto,
      precoUnitario: produto.preco_venda != null ? String(produto.preco_venda) : '',
    })
  }

  function adicionarItem() {
    const ultimoLocal = itens[itens.length - 1]?.localId ?? ''
    setItens((prev) => [...prev, novoItem(ultimoLocal)])
  }

  function removerItem(uid: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((it) => it.uid !== uid) : prev))
  }

  async function salvar() {
    const validos = itens.filter((it) => it.produto && it.localId && Number(it.quantidade) > 0)
    if (validos.length === 0) {
      toast.error('Selecione ao menos um produto, canal e quantidade.')
      return
    }
    for (const it of validos) {
      const disponivel = disponivelPara(it.produto!.id, it.localId)
      if (Number(it.quantidade) > disponivel) {
        toast.error(`Quantidade de "${it.produto!.nome}" maior que o disponível nesse canal (${disponivel}).`)
        return
      }
    }

    setSalvando(true)
    for (const it of validos) {
      const qtd = Number(it.quantidade)
      const preco = Number((it.precoUnitario || '0').replace(',', '.'))
      const { error } = await supabase.from('pedidos').insert({
        produto_id: it.produto!.id,
        local_id: it.localId,
        quantidade: qtd,
        preco_unitario: preco,
        data,
        observacao: observacao.trim() || null,
      })
      if (error) {
        toast.error(`Erro ao lançar pedido de "${it.produto!.nome}".`)
        setSalvando(false)
        return
      }
      await ajustarEstoque(supabase, it.produto!.id, it.localId, -qtd)
      await somarVendaMesCanal(supabase, it.produto!.id, it.localId, qtd)
    }
    setSalvando(false)
    toast.success(`${validos.length} pedido${validos.length === 1 ? '' : 's'} lançado${validos.length === 1 ? '' : 's'}`)
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setModoMassa(false); setItens((prev) => prev.slice(0, 1)) }}
              className={`h-8 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${!modoMassa ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Package className="h-3.5 w-3.5" /> Um produto
            </button>
            <button
              type="button"
              onClick={() => setModoMassa(true)}
              className={`h-8 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${modoMassa ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Boxes className="h-3.5 w-3.5" /> Vários produtos
            </button>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto">
            {itens.map((item) => {
              const disponivel = item.produto && item.localId ? disponivelPara(item.produto.id, item.localId) : null
              return (
                <div key={item.uid} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">Produto</Label>
                    {modoMassa && itens.length > 1 && (
                      <button type="button" onClick={() => removerItem(item.uid)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                  {item.produto ? (
                    <div className="h-8 flex items-center justify-between px-3 rounded-md border border-border bg-muted text-sm">
                      {item.produto.nome}
                      <button type="button" onClick={() => atualizarItem(item.uid, { produto: null })}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <ProdutoAutocomplete produtos={produtos} onSelect={(p) => selecionarProduto(item.uid, p)} />
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Canal</Label>
                      <Select
                        value={item.localId}
                        onValueChange={(v) => atualizarItem(item.uid, { localId: v ?? '' })}
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
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(item.uid, { quantidade: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Preço unit. (R$)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={item.precoUnitario}
                        onChange={(e) => atualizarItem(item.uid, { precoUnitario: e.target.value })}
                      />
                    </div>
                  </div>
                  {disponivel != null && (
                    <p className="text-xs text-muted-foreground">{disponivel} disponível nesse canal</p>
                  )}
                </div>
              )
            })}
          </div>

          {modoMassa && (
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              <Plus className="h-3.5 w-3.5" /> Adicionar outro produto
            </Button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lançar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
