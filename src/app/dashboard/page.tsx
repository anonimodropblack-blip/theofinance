'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Wallet, Warehouse, TrendingUp, Percent, AlertTriangle, Boxes, Receipt } from 'lucide-react'
import type { CategoriaCusto, Configuracao, Estoque, LocalEstoque, Lote, LoteCusto, LoteItem, Produto } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(v: number) {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

type LoteItemComLote = LoteItem & { lote: Lote }
type LoteCustoComCategoria = LoteCusto & { categoria: CategoriaCusto }

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [estoque, setEstoque] = useState<Estoque[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteItens, setLoteItens] = useState<LoteItemComLote[]>([])
  const [loteCustos, setLoteCustos] = useState<LoteCustoComCategoria[]>([])

  useEffect(() => {
    async function carregar() {
      const [
        { data: prods },
        { data: locs },
        { data: cfg },
        { data: est },
        { data: lts },
        { data: itens },
        { data: custos },
      ] = await Promise.all([
        supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
        supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
        supabase.from('configuracoes').select('*').single(),
        supabase.from('estoque').select('*'),
        supabase.from('lotes').select('*').order('data', { ascending: false }),
        supabase.from('lote_itens').select('*, lote:lotes(*)'),
        supabase.from('lote_custos').select('*, categoria:categorias_custo(*)'),
      ])

      setProdutos((prods ?? []) as Produto[])
      setLocais((locs ?? []) as LocalEstoque[])
      setConfig(cfg as Configuracao)
      setEstoque((est ?? []) as Estoque[])
      setLotes((lts ?? []) as Lote[])
      setLoteItens((itens ?? []) as LoteItemComLote[])
      setLoteCustos((custos ?? []) as LoteCustoComCategoria[])
      setLoading(false)
    }
    carregar()
  }, [supabase])

  const kpis = useMemo(() => {
    if (!config) return null

    const impostoPct = (config.imposto_percentual ?? 0) / 100
    const margemMinimaPct = (config.margem_minima_percentual ?? 0) / 100
    const localPorId = new Map(locais.map((l) => [l.id, l]))
    const produtoPorId = new Map(produtos.map((p) => [p.id, p]))

    // total de unidades por lote (converte custos "por_unidade" -> total do lote)
    const unidadesPorLote = new Map<string, number>()
    for (const item of loteItens) {
      unidadesPorLote.set(item.lote_id, (unidadesPorLote.get(item.lote_id) ?? 0) + item.quantidade)
    }

    // investimento total histórico: custo de mercadoria + custos logísticos de todos os lotes
    const investimentoMercadoria = loteItens.reduce((s, i) => s + (i.custo_unitario ?? 0) * i.quantidade, 0)
    const investimentoLogistica = loteCustos.reduce((s, c) => {
      const totalLote = unidadesPorLote.get(c.lote_id) ?? 0
      return s + (c.modo === 'total' ? c.valor : c.valor * totalLote)
    }, 0)
    const investimentoTotal = investimentoMercadoria + investimentoLogistica

    // custo logístico por unidade, por lote
    const custoLogisticaPorLote = new Map<string, number>()
    for (const c of loteCustos) {
      const totalLote = unidadesPorLote.get(c.lote_id) ?? 0
      const porUnidade = c.modo === 'por_unidade' ? c.valor : (totalLote > 0 ? c.valor / totalLote : 0)
      custoLogisticaPorLote.set(c.lote_id, (custoLogisticaPorLote.get(c.lote_id) ?? 0) + porUnidade)
    }

    // custo atual por produto: lote mais recente que contém aquele produto (mesmo critério da Precificação)
    const itensPorProduto = new Map<string, LoteItemComLote[]>()
    for (const item of loteItens) {
      const lista = itensPorProduto.get(item.produto_id) ?? []
      lista.push(item)
      itensPorProduto.set(item.produto_id, lista)
    }

    const custoAtualPorProduto = new Map<string, number>()
    for (const [produtoId, itens] of itensPorProduto) {
      const maisRecente = [...itens].sort((a, b) => {
        const porData = new Date(b.lote.data).getTime() - new Date(a.lote.data).getTime()
        if (porData !== 0) return porData
        return new Date(b.lote.created_at).getTime() - new Date(a.lote.created_at).getTime()
      })[0]
      const custoProduto = maisRecente.custo_unitario ?? 0
      const custoLogistica = custoLogisticaPorLote.get(maisRecente.lote_id) ?? 0
      custoAtualPorProduto.set(produtoId, custoProduto + custoLogistica)
    }

    // estoque total (unidades + valor ao custo atual)
    let estoqueUnidades = 0
    let estoqueValor = 0
    for (const e of estoque) {
      estoqueUnidades += e.quantidade
      const custo = custoAtualPorProduto.get(e.produto_id)
      if (custo != null) estoqueValor += custo * e.quantidade
    }

    // lucro projetado + margem média (ponderada por estoque) + produtos abaixo da margem
    let lucroProjetado = 0
    let margemPonderadaSoma = 0
    let pesoTotal = 0
    const produtosAbaixo = new Set<string>()

    for (const e of estoque) {
      if (e.quantidade <= 0) continue
      const produto = produtoPorId.get(e.produto_id)
      const custoFixoTotal = custoAtualPorProduto.get(e.produto_id)
      if (!produto || custoFixoTotal == null || produto.preco_venda == null) continue

      const local = localPorId.get(e.local_id)
      const taxaPct = local?.tipo === 'marketplace' ? (local.taxa_marketplace ?? 0) / 100 : 0
      const precoVenda = produto.preco_venda

      const lucroUnit = precoVenda - custoFixoTotal - precoVenda * impostoPct - precoVenda * taxaPct
      const margem = precoVenda > 0 ? lucroUnit / precoVenda : 0

      lucroProjetado += lucroUnit * e.quantidade
      margemPonderadaSoma += margem * e.quantidade
      pesoTotal += e.quantidade

      if (margem < margemMinimaPct) produtosAbaixo.add(produto.id)
    }

    const margemMedia = pesoTotal > 0 ? margemPonderadaSoma / pesoTotal : 0

    return {
      investimentoTotal,
      estoqueUnidades,
      estoqueValor,
      lucroProjetado,
      margemMedia,
      temEstoqueComMargem: pesoTotal > 0,
      produtosAbaixoCount: produtosAbaixo.size,
    }
  }, [config, locais, produtos, estoque, loteItens, loteCustos])

  const ultimosLotes = useMemo(() => {
    const qtdPorLote = new Map<string, number>()
    for (const item of loteItens) {
      qtdPorLote.set(item.lote_id, (qtdPorLote.get(item.lote_id) ?? 0) + item.quantidade)
    }
    return lotes.slice(0, 5).map((l) => ({ ...l, quantidade: qtdPorLote.get(l.id) ?? 0 }))
  }, [lotes, loteItens])

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <Wallet className="h-3.5 w-3.5" /> Investimento Total
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(kpis.investimentoTotal)}</CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <Warehouse className="h-3.5 w-3.5" /> Estoque Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{kpis.estoqueUnidades} un.</div>
            <div className="text-xs text-muted-foreground">{formatCurrency(kpis.estoqueValor)} em custo</div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <TrendingUp className="h-3.5 w-3.5" /> Lucro Projetado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(kpis.lucroProjetado)}</CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <Percent className="h-3.5 w-3.5" /> Margem Média
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {kpis.temEstoqueComMargem ? formatPct(kpis.margemMedia * 100) : '—'}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <AlertTriangle className="h-3.5 w-3.5" /> Abaixo da Margem
            </CardTitle>
          </CardHeader>
          <CardContent className={`text-lg font-semibold ${kpis.produtosAbaixoCount > 0 ? 'text-destructive' : ''}`}>
            {kpis.produtosAbaixoCount} produto{kpis.produtosAbaixoCount === 1 ? '' : 's'}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <Receipt className="h-3.5 w-3.5" /> Custo Fixo Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{formatCurrency(config?.custo_fixo_mensal ?? 0)}</div>
            <div className="text-xs text-muted-foreground">assinaturas/mensalidades de marketplace</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Boxes className="h-4 w-4" /> Últimos Lotes
        </h2>
        <div className="rounded-lg border border-border overflow-x-auto">
          {ultimosLotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm">Nenhum lote cadastrado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Qtd. Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosLotes.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.codigo}</TableCell>
                    <TableCell className="text-muted-foreground">{l.fornecedor}</TableCell>
                    <TableCell className="text-muted-foreground">{formatData(l.data)}</TableCell>
                    <TableCell className="text-right">{l.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
