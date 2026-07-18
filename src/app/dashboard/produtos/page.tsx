'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Loader2, Package } from 'lucide-react'
import { ProdutoDialog } from '@/components/produtos/produto-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Configuracao, FaixaTaxaMarketplace, Produto } from '@/types'

type ProdutoComEstoque = Produto & { estoqueTotal: number }

function formatCurrency(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(v: number | null) {
  if (v == null) return '—'
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function mesesDesde(iso: string) {
  const dias = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.floor(dias / 30))
}

// Taxa de comissão da faixa em que o preço de venda se encaixa (quanto mais barato, maior a taxa).
// `faixas` já vem ordenada por ate_valor crescente, com a faixa sem limite (null) por último.
function obterTaxaFaixa(precoVenda: number, faixas: FaixaTaxaMarketplace[]) {
  const faixa = faixas.find((f) => f.ate_valor == null || precoVenda < f.ate_valor)
  return faixa ? faixa.taxa_percentual : 0
}

// Projeção simplificada: desconta a taxa de comissão por faixa de preço + o imposto configurado.
// Não entra custo de lote (frete/embalagem) — isso já aparece com detalhe real na Precificação.
function calcularProjecao(p: Produto, impostoPercentual: number, faixas: FaixaTaxaMarketplace[]) {
  const precoTotal = p.preco_custo_unitario != null && p.qtd_minima != null
    ? p.preco_custo_unitario * p.qtd_minima
    : null

  const lucroPorUnidade = p.preco_venda != null && p.preco_custo_unitario != null
    ? p.preco_venda
      - p.preco_custo_unitario
      - p.preco_venda * (obterTaxaFaixa(p.preco_venda, faixas) / 100)
      - p.preco_venda * (impostoPercentual / 100)
    : null

  const margemPct = lucroPorUnidade != null && p.preco_venda ? (lucroPorUnidade / p.preco_venda) * 100 : null

  const lucroMes = lucroPorUnidade != null && p.vendas_mes != null ? lucroPorUnidade * p.vendas_mes : null

  const lucroTotal = lucroMes != null ? lucroMes * mesesDesde(p.created_at) : null

  return { precoTotal, lucroPorUnidade, margemPct, lucroMes, lucroTotal }
}

export default function ProdutosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [faixas, setFaixas] = useState<FaixaTaxaMarketplace[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: cfg }, { data: fxs }] = await Promise.all([
      supabase.from('produtos').select('*, estoque(quantidade)').order('nome'),
      supabase.from('configuracoes').select('*').single(),
      supabase.from('faixas_taxa_marketplace').select('*'),
    ])

    if (!error && data) {
      setProdutos(
        data.map((p) => {
          const { estoque, ...produto } = p as Produto & { estoque: { quantidade: number }[] }
          return {
            ...produto,
            estoqueTotal: estoque.reduce((soma, e) => soma + e.quantidade, 0),
          }
        })
      )
    }
    setConfig(cfg as Configuracao)
    setFaixas(
      ((fxs ?? []) as FaixaTaxaMarketplace[]).sort((a, b) => {
        if (a.ate_valor == null) return 1
        if (b.ate_valor == null) return -1
        return a.ate_valor - b.ate_valor
      })
    )
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = produtos.filter((p) => {
    const q = busca.toLowerCase()
    return !q || p.nome.toLowerCase().includes(q) || (p.fabricante ?? '').toLowerCase().includes(q)
  })

  const impostoPercentual = config?.imposto_percentual ?? 0

  const totais = useMemo(() => {
    let lucroMes = 0
    let lucroTotal = 0
    for (const p of produtos) {
      if (p.status !== 'ativo') continue
      const projecao = calcularProjecao(p, impostoPercentual, faixas)
      if (projecao.lucroMes != null) lucroMes += projecao.lucroMes
      if (projecao.lucroTotal != null) lucroTotal += projecao.lucroTotal
    }
    return { lucroMes, lucroTotal }
  }, [produtos, impostoPercentual, faixas])

  function abrirNovo() {
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(p: Produto) {
    setEditando(p)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Lucro/Mês (todos ativos)</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(totais.lucroMes)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Lucro Total (todos ativos)</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(totais.lucroTotal)}</CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto ou fabricante..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Package className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{produtos.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="whitespace-nowrap">Fabricante</TableHead>
                <TableHead className="whitespace-nowrap">Produto</TableHead>
                <TableHead className="whitespace-nowrap">Fórmula</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="text-right whitespace-nowrap">Qtd. Mín.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Preço/Und.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Preço Total</TableHead>
                <TableHead className="text-right whitespace-nowrap">Estoque</TableHead>
                <TableHead className="text-right whitespace-nowrap">Revenda</TableHead>
                <TableHead className="text-right whitespace-nowrap">Margem %</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro/Unid.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Vendas/Mês</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro/Mês</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const { precoTotal, lucroPorUnidade, margemPct, lucroMes, lucroTotal } = calcularProjecao(p, impostoPercentual, faixas)
                const margemBaixa = margemPct != null && config != null && margemPct < config.margem_minima_percentual
                return (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{p.sku ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{p.fabricante ?? '—'}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{p.formula ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{p.tipo ?? '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{p.qtd_minima ?? '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.preco_custo_unitario)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(precoTotal)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{p.estoqueTotal}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.preco_venda)}</TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${margemBaixa ? 'text-destructive font-medium' : ''}`}>
                    {formatPct(margemPct)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(lucroPorUnidade)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{p.vendas_mes ?? '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(lucroMes)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(lucroTotal)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'ativo' ? 'default' : 'secondary'}>
                      {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEdicao(p)}>Editar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ProdutoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produto={editando}
        onSaved={carregar}
      />
    </div>
  )
}
