'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ajustarEstoque } from '@/lib/estoque'
import { somarVendaMesCanal } from '@/lib/vendas-canal'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Loader2,
  X,
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  Calendar,
  Store,
  Hash,
  FileText,
} from 'lucide-react'
import type { Estoque, LocalEstoque, Produto } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  locais: LocalEstoque[]
  estoque: Estoque[]
  onSaved: () => void
}

type Erros = {
  produto?: string
  local?: string
  quantidade?: string
  preco?: string
}

type ItemPedido = {
  uid: string
  produto: Produto | null
  localId: string
  quantidade: number
  precoUnitario: string
  erros: Erros
}

function novoItem(localId = ''): ItemPedido {
  return { uid: Math.random().toString(36).slice(2), produto: null, localId, quantidade: 1, precoUnitario: '', erros: {} }
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function iniciais(nome: string) {
  return nome.trim().slice(0, 2).toUpperCase()
}

function estoqueTotalProduto(estoque: Estoque[], produtoId: string) {
  return estoque.filter((e) => e.produto_id === produtoId).reduce((s, e) => s + e.quantidade, 0)
}

function ProdutoCombobox({
  produtos,
  estoque,
  value,
  onChange,
}: {
  produtos: Produto[]
  estoque: Estoque[]
  value: Produto | null
  onChange: (p: Produto) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const resultados = busca.trim()
    ? produtos
        .filter(
          (p) =>
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            (p.sku ?? '').toLowerCase().includes(busca.toLowerCase())
        )
        .slice(0, 8)
    : produtos.slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-input bg-input/30 px-3 text-left text-[15px] transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 outline-none"
      >
        {value ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {iniciais(value.nome)}
            </span>
            <span className="flex-1 truncate">{value.nome}</span>
            {value.sku && <span className="shrink-0 text-xs text-muted-foreground">SKU {value.sku}</span>}
          </>
        ) : (
          <>
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Buscar produto...</span>
          </>
        )}
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1.5 w-full animate-in overflow-hidden rounded-xl border border-border bg-popover shadow-lg fade-in-0 zoom-in-95">
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              placeholder="Digite o nome ou SKU..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {resultados.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              resultados.map((p) => {
                const total = estoqueTotalProduto(estoque, p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p)
                      setAberto(false)
                      setBusca('')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {iniciais(p.nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', total > 0 ? 'bg-success' : 'bg-muted-foreground/40')} />
                        <span className="truncate">{p.nome}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.sku ? `SKU: ${p.sku}` : 'Sem SKU'}
                        {p.tipo ? ` · ${p.tipo}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{total} un.</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function validarItem(item: ItemPedido, estoque: Estoque[]): Erros {
  const erros: Erros = {}
  if (!item.produto) erros.produto = 'Selecione um produto.'
  if (!item.localId) erros.local = 'Selecione um canal.'
  if (!item.quantidade || item.quantidade < 1) {
    erros.quantidade = 'Quantidade mínima é 1.'
  } else if (item.produto && item.localId) {
    const disponivel = estoque.find((e) => e.produto_id === item.produto!.id && e.local_id === item.localId)?.quantidade ?? 0
    if (item.quantidade > disponivel) erros.quantidade = `Só ${disponivel} disponível nesse canal.`
  }
  if (item.precoUnitario.trim() === '') erros.preco = 'Informe o preço.'
  return erros
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
    setItens((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch, erros: {} } : it)))
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

  function totalItem(item: ItemPedido) {
    const preco = Number((item.precoUnitario || '0').replace(',', '.')) || 0
    return item.quantidade * preco
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validados = itens.map((it) => ({ ...it, erros: validarItem(it, estoque) }))
    setItens(validados)
    if (validados.some((it) => Object.keys(it.erros).length > 0)) return

    setSalvando(true)
    for (const it of validados) {
      const preco = Number(it.precoUnitario.replace(',', '.'))
      const { error } = await supabase.from('pedidos').insert({
        produto_id: it.produto!.id,
        local_id: it.localId,
        quantidade: it.quantidade,
        preco_unitario: preco,
        data,
        observacao: observacao.trim() || null,
      })
      if (error) {
        toast.error(`Erro ao lançar pedido de "${it.produto!.nome}".`)
        setSalvando(false)
        return
      }
      await ajustarEstoque(supabase, it.produto!.id, it.localId, -it.quantidade)
      await somarVendaMesCanal(supabase, it.produto!.id, it.localId, it.quantidade)
    }
    setSalvando(false)
    toast.success(validados.length === 1 ? 'Pedido lançado com sucesso.' : `${validados.length} pedidos lançados com sucesso.`)
    onOpenChange(false)
    onSaved()
  }

  const totalGeral = itens.reduce((s, it) => s + totalItem(it), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-6 rounded-3xl p-10 sm:max-w-2xl">
        <DialogClose
          type="button"
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </DialogClose>

        <DialogHeader className="gap-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-[28px] font-semibold leading-tight">Novo Pedido</DialogTitle>
              <DialogDescription className="text-sm">Crie um novo lançamento de venda.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="relative flex rounded-full bg-muted p-1">
            <div
              className={cn(
                'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-background shadow-sm transition-transform duration-200 ease-out',
                modoMassa && 'translate-x-[calc(100%+4px)]'
              )}
            />
            <button
              type="button"
              onClick={() => {
                setModoMassa(false)
                setItens((prev) => prev.slice(0, 1))
              }}
              className={cn(
                'relative z-10 h-[42px] flex-1 rounded-full text-sm font-medium transition-colors',
                !modoMassa ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Um Produto
            </button>
            <button
              type="button"
              onClick={() => setModoMassa(true)}
              className={cn(
                'relative z-10 h-[42px] flex-1 rounded-full text-sm font-medium transition-colors',
                modoMassa ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Vários Produtos
            </button>
          </div>

          <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
            {itens.map((item) => (
              <div key={item.uid} className={cn('space-y-4', modoMassa && 'rounded-2xl border border-border p-4')}>
                {modoMassa && itens.length > 1 && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => removerItem(item.uid)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground transition-colors hover:text-destructive" />
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[13px]">Produto</Label>
                  <ProdutoCombobox
                    produtos={produtos}
                    estoque={estoque}
                    value={item.produto}
                    onChange={(p) => selecionarProduto(item.uid, p)}
                  />
                  {item.erros.produto && <p className="text-xs text-destructive">{item.erros.produto}</p>}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[13px]">
                      <Store className="h-3 w-3" /> Canal
                    </Label>
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
                    {item.erros.local && <p className="text-xs text-destructive">{item.erros.local}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[13px]">
                      <Hash className="h-3 w-3" /> Quantidade
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => atualizarItem(item.uid, { quantidade: Math.max(1, item.quantidade - 1) })}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-input/30 text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(item.uid, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                        className="text-center"
                      />
                      <button
                        type="button"
                        onClick={() => atualizarItem(item.uid, { quantidade: item.quantidade + 1 })}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-input/30 text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {item.erros.quantidade ? (
                      <p className="text-xs text-destructive">{item.erros.quantidade}</p>
                    ) : item.produto && item.localId ? (
                      <p className="text-xs text-muted-foreground">{disponivelPara(item.produto.id, item.localId)} disponível nesse canal</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[13px]">Preço Unitário</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={item.precoUnitario}
                        onChange={(e) => atualizarItem(item.uid, { precoUnitario: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                    {item.erros.preco && <p className="text-xs text-destructive">{item.erros.preco}</p>}
                  </div>
                </div>

                <div key={totalItem(item)} className="flex animate-in items-center justify-between rounded-xl bg-primary/10 px-4 py-3 fade-in-0">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="text-lg font-semibold text-primary">{formatCurrency(totalItem(item))}</span>
                </div>
              </div>
            ))}
          </div>

          {modoMassa && (
            <div className="space-y-3">
              <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                <Plus className="h-3.5 w-3.5" /> Adicionar outro produto
              </Button>
              {itens.length > 1 && (
                <div key={totalGeral} className="flex animate-in items-center justify-between rounded-xl border border-border px-4 py-3 fade-in-0">
                  <span className="text-sm font-medium">Total do pedido</span>
                  <span className="text-lg font-semibold">{formatCurrency(totalGeral)}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Data</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-[13px]">
              <FileText className="h-3 w-3" /> Observação (opcional)
            </Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Adicione uma observação para este pedido..."
            />
          </div>

          <DialogFooter className="-mx-10 -mb-10 mt-2 rounded-b-3xl p-6">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lançar Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
