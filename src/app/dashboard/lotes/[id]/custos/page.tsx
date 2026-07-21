'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CelulaEditavel } from '@/components/produtos/celula-editavel'
import { ProdutoAutocomplete } from '@/components/produtos/produto-autocomplete'
import { ajustarEstoque } from '@/lib/estoque'
import { toast } from 'sonner'
import { Loader2, Trash2, ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import type { CategoriaCusto, Lote, LoteCusto, LoteItem, Produto } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CustosLotePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [lote, setLote] = useState<Lote | null>(null)
  const [itens, setItens] = useState<(LoteItem & { produto: Produto })[]>([])
  const [totalUnidades, setTotalUnidades] = useState(0)
  const [categorias, setCategorias] = useState<CategoriaCusto[]>([])
  const [custos, setCustos] = useState<(LoteCusto & { categoria: CategoriaCusto })[]>([])
  const [produtosAtivos, setProdutosAtivos] = useState<Produto[]>([])
  const [casaLocalId, setCasaLocalId] = useState('')
  const [loading, setLoading] = useState(true)

  const [categoriaId, setCategoriaId] = useState('')
  const [modo, setModo] = useState<'total' | 'por_unidade'>('total')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [novoProduto, setNovoProduto] = useState<Produto | null>(null)
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [novoCustoUnitario, setNovoCustoUnitario] = useState('')
  const [salvandoItem, setSalvandoItem] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: loteData }, { data: itensData }, { data: catData }, { data: custosData }, { data: produtosData }, { data: casa }] = await Promise.all([
      supabase.from('lotes').select('*').eq('id', params.id).single(),
      supabase.from('lote_itens').select('*, produto:produtos(*)').eq('lote_id', params.id),
      supabase.from('categorias_custo').select('*').eq('ativo', true).order('nome'),
      supabase.from('lote_custos').select('*, categoria:categorias_custo(*)').eq('lote_id', params.id).order('created_at'),
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('locais_estoque').select('id').eq('nome', 'Casa').single(),
    ])

    setLote(loteData as Lote)
    setItens((itensData ?? []) as (LoteItem & { produto: Produto })[])
    setTotalUnidades((itensData ?? []).reduce((s, i) => s + i.quantidade, 0))
    setCategorias((catData ?? []) as CategoriaCusto[])
    setCustos((custosData ?? []) as (LoteCusto & { categoria: CategoriaCusto })[])
    setProdutosAtivos((produtosData ?? []) as Produto[])
    setCasaLocalId(casa?.id ?? '')
    setLoading(false)
  }, [supabase, params.id])

  useEffect(() => { carregar() }, [carregar])

  async function salvarCusto() {
    if (!categoriaId || !valor) {
      toast.error('Selecione a categoria e informe o valor.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('lote_custos').insert({
      lote_id: params.id,
      categoria_id: categoriaId,
      modo,
      valor: Number(valor.replace(',', '.')),
      descricao: descricao.trim() || null,
    })
    setSalvando(false)
    if (error) { toast.error('Erro ao salvar custo.'); return }

    setCategoriaId('')
    setModo('total')
    setValor('')
    setDescricao('')
    toast.success('Custo adicionado')
    carregar()
  }

  async function removerCusto(id: string) {
    await supabase.from('lote_custos').delete().eq('id', id)
    carregar()
  }

  async function renomearLote(campo: 'codigo' | 'fornecedor', novoValor: string) {
    if (!novoValor.trim()) return
    const { error } = await supabase.from('lotes').update({ [campo]: novoValor.trim() }).eq('id', params.id)
    if (error) { toast.error('Erro ao salvar.'); return }
    carregar()
  }

  async function atualizarQuantidadeItem(item: LoteItem, novaQtdTexto: string) {
    const novaQtd = parseInt(novaQtdTexto, 10)
    if (Number.isNaN(novaQtd) || novaQtd <= 0 || novaQtd === item.quantidade) return
    const delta = novaQtd - item.quantidade
    const { error } = await supabase.from('lote_itens').update({ quantidade: novaQtd }).eq('id', item.id)
    if (error) { toast.error('Erro ao salvar quantidade.'); return }
    if (casaLocalId) {
      await supabase.from('movimentacoes').insert({
        produto_id: item.produto_id, tipo: 'ajuste', quantidade: delta,
        origem_local_id: casaLocalId, lote_id: params.id, observacao: 'Correção de quantidade do lote',
      })
      await ajustarEstoque(supabase, item.produto_id, casaLocalId, delta)
    }
    toast.success('Quantidade atualizada')
    carregar()
  }

  async function atualizarCustoUnitarioItem(item: LoteItem, novoValorTexto: string) {
    const novoValorNumero = Number(novoValorTexto.replace(',', '.'))
    if (Number.isNaN(novoValorNumero)) return
    const { error } = await supabase.from('lote_itens').update({ custo_unitario: novoValorNumero }).eq('id', item.id)
    if (error) { toast.error('Erro ao salvar custo.'); return }
    toast.success('Custo atualizado')
    carregar()
  }

  async function removerItem(item: LoteItem & { produto: Produto }) {
    if (!window.confirm(`Remover "${item.produto?.nome}" deste lote?`)) return
    const { error } = await supabase.from('lote_itens').delete().eq('id', item.id)
    if (error) { toast.error('Erro ao remover produto.'); return }
    if (casaLocalId) {
      await supabase.from('movimentacoes').insert({
        produto_id: item.produto_id, tipo: 'ajuste', quantidade: -item.quantidade,
        origem_local_id: casaLocalId, lote_id: params.id, observacao: 'Remoção de produto do lote',
      })
      await ajustarEstoque(supabase, item.produto_id, casaLocalId, -item.quantidade)
    }
    toast.success('Produto removido do lote')
    carregar()
  }

  async function adicionarItem() {
    if (!novoProduto || !novaQuantidade || Number(novaQuantidade) <= 0 || !novoCustoUnitario) {
      toast.error('Selecione o produto e informe quantidade e custo unitário.')
      return
    }
    setSalvandoItem(true)
    const quantidade = Number(novaQuantidade)
    const custoUnitario = Number(novoCustoUnitario.replace(',', '.'))

    const { error } = await supabase.from('lote_itens').insert({
      lote_id: params.id, produto_id: novoProduto.id, quantidade, custo_unitario: custoUnitario,
    })
    if (error) { toast.error('Erro ao adicionar produto.'); setSalvandoItem(false); return }

    if (casaLocalId) {
      await supabase.from('movimentacoes').insert({
        produto_id: novoProduto.id, tipo: 'entrada_lote', quantidade,
        destino_local_id: casaLocalId, lote_id: params.id, data: lote?.data,
      })
      await ajustarEstoque(supabase, novoProduto.id, casaLocalId, quantidade)
    }

    setSalvandoItem(false)
    setNovoProduto(null)
    setNovaQuantidade('')
    setNovoCustoUnitario('')
    toast.success('Produto adicionado ao lote')
    carregar()
  }

  // Resumo — converte tudo pra valor total (modo por_unidade * total de unidades do lote)
  const resumoPorCategoria = custos.reduce<Record<string, number>>((acc, c) => {
    const totalDoItem = c.modo === 'por_unidade' ? c.valor * totalUnidades : c.valor
    acc[c.categoria.nome] = (acc[c.categoria.nome] ?? 0) + totalDoItem
    return acc
  }, {})

  const totalCustos = Object.values(resumoPorCategoria).reduce((s, v) => s + v, 0)
  const custoPorUnidade = totalUnidades > 0 ? totalCustos / totalUnidades : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/dashboard/lotes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          Lotes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          Custos do{' '}
          <CelulaEditavel
            valor={lote?.codigo ?? ''}
            onSalvar={(v) => renomearLote('codigo', v)}
          />
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
          <CelulaEditavel
            valor={lote?.fornecedor ?? ''}
            onSalvar={(v) => renomearLote('fornecedor', v)}
          />
          <span>· {totalUnidades} unidades</span>
        </p>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Produtos do lote</p>
        {itens.map((i) => (
          <div key={i.id} className="flex items-center justify-between text-sm py-1 gap-3">
            <span className="flex-1 min-w-0 truncate">{i.produto?.nome ?? '—'}</span>
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <CelulaEditavel
                valor={String(i.quantidade)}
                exibir={`${i.quantidade} un.`}
                align="right"
                tipo="numeric"
                onSalvar={(v) => atualizarQuantidadeItem(i, v)}
              />
              <CelulaEditavel
                valor={String(i.custo_unitario ?? 0)}
                exibir={`${formatCurrency(i.custo_unitario ?? 0)}/un`}
                align="right"
                tipo="decimal"
                onSalvar={(v) => atualizarCustoUnitarioItem(i, v)}
              />
              <span className="font-medium text-foreground w-20 text-right">{formatCurrency((i.custo_unitario ?? 0) * i.quantidade)}</span>
              <button type="button" onClick={() => removerItem(i)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-end gap-2 pt-3 mt-2 border-t border-border">
          <div className="flex-1 min-w-0">
            {novoProduto ? (
              <div className="h-8 flex items-center justify-between px-3 rounded-md border border-border bg-muted text-sm">
                {novoProduto.nome}
                <button type="button" onClick={() => setNovoProduto(null)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <ProdutoAutocomplete
                produtos={produtosAtivos}
                onSelect={setNovoProduto}
                excludeIds={itens.map((i) => i.produto_id)}
                placeholder="Adicionar produto ao lote..."
              />
            )}
          </div>
          <Input
            type="number"
            min={1}
            placeholder="Qtd."
            className="w-20"
            value={novaQuantidade}
            onChange={(e) => setNovaQuantidade(e.target.value)}
          />
          <Input
            inputMode="decimal"
            placeholder="Custo/un"
            className="w-24"
            value={novoCustoUnitario}
            onChange={(e) => setNovoCustoUnitario(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={adicionarItem} disabled={salvandoItem}>
            {salvandoItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={categoriaId}
            onValueChange={(v) => setCategoriaId(v ?? '')}
            items={Object.fromEntries(categorias.map((c) => [c.id, c.nome]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select
              value={modo}
              onValueChange={(v) => setModo(v as 'total' | 'por_unidade')}
              items={{ total: 'Valor total', por_unidade: 'Valor por unidade' }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Valor total</SelectItem>
                <SelectItem value="por_unidade">Valor por unidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição (opcional)</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <Button onClick={salvarCusto} disabled={salvando} className="w-full">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
        </Button>
      </div>

      {custos.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Custos lançados</p>
          {custos.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm py-1">
              <div>
                <span>{c.categoria.nome}</span>
                {c.descricao && <span className="text-muted-foreground"> · {c.descricao}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {formatCurrency(c.valor)}{c.modo === 'por_unidade' ? '/un' : ''}
                </span>
                <button type="button" onClick={() => removerCusto(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Resumo</p>
        {Object.entries(resumoPorCategoria).map(([nome, v]) => (
          <div key={nome} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{nome}</span>
            <span>{formatCurrency(v)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm font-medium pt-2 mt-2 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(totalCustos)}</span>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-primary">
          <span>Custo por unidade</span>
          <span>{formatCurrency(custoPorUnidade)}</span>
        </div>
      </div>
    </div>
  )
}
