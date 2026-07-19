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
import { obterTarifaFba } from '@/lib/fba'
import type { Configuracao, FaixaLogisticaFba, Produto } from '@/types'

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

// Projeção com os custos reais da Amazon (a mesma taxa e tarifa usadas na Precificação):
// comissão % do nicho (Saúde e Cuidados Pessoais) + tarifa de logística FBA por peso/preço + imposto.
// Não entra custo de lote (frete/embalagem) — isso já aparece com detalhe real na Precificação.
function calcularProjecao(p: Produto, impostoPercentual: number, comissaoPercentual: number, faixasFba: FaixaLogisticaFba[]) {
  const precoTotal = p.preco_custo_unitario != null && p.qtd_minima != null
    ? p.preco_custo_unitario * p.qtd_minima
    : null

  const valorComissao = p.preco_venda != null ? p.preco_venda * (comissaoPercentual / 100) : null
  const valorImposto = p.preco_venda != null ? p.preco_venda * (impostoPercentual / 100) : null
  const pesoFaltando = p.preco_venda != null && p.peso_gramas == null
  const valorLogistica = p.preco_venda != null && p.peso_gramas != null
    ? obterTarifaFba(p.peso_gramas, p.preco_venda, faixasFba)
    : null

  const lucroPorUnidade = p.preco_venda != null && p.preco_custo_unitario != null && valorComissao != null && valorImposto != null
    ? p.preco_venda - p.preco_custo_unitario - valorComissao - valorImposto - (valorLogistica ?? 0)
    : null

  const margemPct = lucroPorUnidade != null && p.preco_venda ? (lucroPorUnidade / p.preco_venda) * 100 : null

  const lucroMes = lucroPorUnidade != null && p.vendas_mes != null ? lucroPorUnidade * p.vendas_mes : null

  const lucroTotal = lucroMes != null ? lucroMes * mesesDesde(p.created_at) : null

  return { precoTotal, valorComissao, valorImposto, valorLogistica, pesoFaltando, lucroPorUnidade, margemPct, lucroMes, lucroTotal }
}

export default function ProdutosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [comissaoPercentual, setComissaoPercentual] = useState(0)
  const [faixasFba, setFaixasFba] = useState<FaixaLogisticaFba[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: cfg }, { data: locs }, { data: fxsFba }] = await Promise.all([
      supabase.from('produtos').select('*, estoque(quantidade)').order('nome'),
      supabase.from('configuracoes').select('*').single(),
      supabase.from('locais_estoque').select('*').eq('usa_tarifa_fba', true),
      supabase.from('faixas_logistica_fba').select('*'),
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
    setComissaoPercentual(locs?.[0]?.taxa_marketplace ?? 0)
    setFaixasFba(
      ((fxsFba ?? []) as FaixaLogisticaFba[]).sort((a, b) => {
        if (a.peso_min !== b.peso_min) return a.peso_min - b.peso_min
        return a.preco_min - b.preco_min
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
      const projecao = calcularProjecao(p, impostoPercentual, comissaoPercentual, faixasFba)
      if (projecao.lucroMes != null) lucroMes += projecao.lucroMes
      if (projecao.lucroTotal != null) lucroTotal += projecao.lucroTotal
    }
    return { lucroMes, lucroTotal }
  }, [produtos, impostoPercentual, comissaoPercentual, faixasFba])

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
                <TableHead className="text-right whitespace-nowrap">Comissão</TableHead>
                <TableHead className="text-right whitespace-nowrap">Imposto</TableHead>
                <TableHead className="text-right whitespace-nowrap">Logística FBA</TableHead>
                <TableHead className="text-right whitespace-nowrap">Margem %</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro Líquido/Unid.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Vendas/Mês</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro/Mês</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const { precoTotal, valorComissao, valorImposto, valorLogistica, pesoFaltando, lucroPorUnidade, margemPct, lucroMes, lucroTotal } = calcularProjecao(p, impostoPercentual, comissaoPercentual, faixasFba)
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
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {formatCurrency(valorComissao)} <span className="text-xs">({formatPct(p.preco_venda != null ? comissaoPercentual : null)})</span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">{formatCurrency(valorImposto)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {pesoFaltando ? <span className="text-amber-600 dark:text-amber-500">sem peso</span> : formatCurrency(valorLogistica)}
                  </TableCell>
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
