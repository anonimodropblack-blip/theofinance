'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProdutoAutocomplete } from '@/components/produtos/produto-autocomplete'
import { ajustarEstoque } from '@/lib/estoque'
import { toast } from 'sonner'
import Link from 'next/link'
import { Loader2, Trash2, X, ArrowLeft } from 'lucide-react'
import type { Produto } from '@/types'

type ItemLote = { produto: Produto; quantidade: number; custoUnitario: number }

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export default function NovoLotePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedor, setFornecedor] = useState('')
  const [data, setData] = useState(hoje())
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [itens, setItens] = useState<ItemLote[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    supabase.from('produtos').select('*').eq('status', 'ativo').order('nome').then(({ data }) => {
      if (data) setProdutos(data as Produto[])
    })
  }, [supabase])

  function adicionarItem() {
    if (!produtoSelecionado || !quantidade || Number(quantidade) <= 0 || !custoUnitario) {
      toast.error('Selecione o produto e informe quantidade e custo unitário.')
      return
    }
    setItens((prev) => [
      ...prev,
      {
        produto: produtoSelecionado,
        quantidade: Number(quantidade),
        custoUnitario: Number(custoUnitario.replace(',', '.')),
      },
    ])
    setProdutoSelecionado(null)
    setQuantidade('')
    setCustoUnitario('')
  }

  function removerItem(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produto.id !== produtoId))
  }

  const totalUnidades = itens.reduce((soma, i) => soma + i.quantidade, 0)

  async function salvar() {
    if (!fornecedor.trim()) { toast.error('Informe o fornecedor.'); return }
    if (itens.length === 0) { toast.error('Adicione ao menos um produto.'); return }

    setSalvando(true)

    const { count } = await supabase.from('lotes').select('*', { count: 'exact', head: true })
    const codigo = `Lote ${String((count ?? 0) + 1).padStart(3, '0')}`

    const { data: lote, error: erroLote } = await supabase
      .from('lotes')
      .insert({ codigo, fornecedor: fornecedor.trim(), data })
      .select()
      .single()

    if (erroLote || !lote) {
      toast.error('Erro ao criar lote.')
      setSalvando(false)
      return
    }

    const { error: erroItens } = await supabase.from('lote_itens').insert(
      itens.map((i) => ({
        lote_id: lote.id,
        produto_id: i.produto.id,
        quantidade: i.quantidade,
        custo_unitario: i.custoUnitario,
      }))
    )
    if (erroItens) {
      toast.error('Erro ao salvar produtos do lote.')
      setSalvando(false)
      return
    }

    const { data: casa } = await supabase.from('locais_estoque').select('id').eq('nome', 'Casa').single()

    if (casa) {
      await supabase.from('movimentacoes').insert(
        itens.map((i) => ({
          produto_id: i.produto.id,
          tipo: 'entrada_lote',
          quantidade: i.quantidade,
          destino_local_id: casa.id,
          lote_id: lote.id,
          data,
        }))
      )

      for (const item of itens) {
        await ajustarEstoque(supabase, item.produto.id, casa.id, item.quantidade)
      }
    }

    toast.success(`${codigo} criado com sucesso`)
    router.push(`/dashboard/lotes/${lote.id}/custos`)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/dashboard/lotes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          Lotes
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Novo Lote</h1>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fornecedor">Fornecedor</Label>
          <Input id="fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>Produto</Label>
            {produtoSelecionado ? (
              <div className="h-8 flex items-center justify-between px-3 rounded-md border border-border bg-muted text-sm">
                {produtoSelecionado.nome}
                <button type="button" onClick={() => setProdutoSelecionado(null)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <ProdutoAutocomplete
                produtos={produtos}
                onSelect={setProdutoSelecionado}
                excludeIds={itens.map((i) => i.produto.id)}
              />
            )}
          </div>
          <div className="w-24 space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div className="w-32 space-y-2">
            <Label>Custo/un (R$)</Label>
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={custoUnitario}
              onChange={(e) => setCustoUnitario(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" onClick={adicionarItem}>Adicionar</Button>
        </div>

        {itens.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos adicionados</p>
            {itens.map((i) => (
              <div key={i.produto.id} className="flex items-center justify-between text-sm py-1">
                <span>{i.produto.nome}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {i.quantidade} × {formatCurrency(i.custoUnitario)}
                  </span>
                  <button type="button" onClick={() => removerItem(i.produto.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border font-medium">
              <span>Total</span>
              <span>{totalUnidades} unidades</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
