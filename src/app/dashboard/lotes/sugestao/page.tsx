'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Copy, Loader2, ClipboardList, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { calcularMediaDiaria, calcularSugestaoPedido, ultimoPrecoCompra } from '@/lib/reposicao'
import { type LoteItemComLote } from '@/lib/custo-real'
import { NovaContaPagarDialog } from '@/components/financeiro/nova-conta-pagar-dialog'
import type { Configuracao, Estoque, FechamentoMensalProduto, LocalEstoque, Lote, Produto } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function paraNumero(v: string): number {
  const limpo = v.trim().replace(',', '.')
  return limpo === '' ? 0 : Number(limpo) || 0
}

function hojeFormatado() {
  const hoje = new Date()
  const dia = String(hoje.getDate()).padStart(2, '0')
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${hoje.getFullYear()}`
}

export default function SugestaoPedidoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [estoque, setEstoque] = useState<Estoque[]>([])
  const [fechamentos, setFechamentos] = useState<FechamentoMensalProduto[]>([])
  const [loteItens, setLoteItens] = useState<LoteItemComLote[]>([])
  const [locaisMarketplace, setLocaisMarketplace] = useState<LocalEstoque[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [loading, setLoading] = useState(true)

  const [fornecedorFiltro, setFornecedorFiltro] = useState('')
  const [plataforma, setPlataforma] = useState('')
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [precos, setPrecos] = useState<Record<string, string>>({})
  const [fazendoPedido, setFazendoPedido] = useState(false)
  const [loteCriado, setLoteCriado] = useState<Lote | null>(null)
  const [contaPagarDialogOpen, setContaPagarDialogOpen] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: est }, { data: fech }, { data: itens }, { data: locs }, { data: cfg }] = await Promise.all([
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('estoque').select('*'),
      supabase.from('fechamentos_mensais_produtos').select('*'),
      supabase.from('lote_itens').select('*, lote:lotes(*)'),
      supabase.from('locais_estoque').select('*').eq('tipo', 'marketplace').eq('ativo', true).order('ordem'),
      supabase.from('configuracoes').select('*').single(),
    ])
    setProdutos((prods ?? []) as Produto[])
    setEstoque((est ?? []) as Estoque[])
    setFechamentos((fech ?? []) as FechamentoMensalProduto[])
    setLoteItens((itens ?? []) as LoteItemComLote[])
    setLocaisMarketplace((locs ?? []) as LocalEstoque[])
    setConfig(cfg as Configuracao)
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const fornecedores = useMemo(
    () => [...new Set(produtos.map((p) => p.fabricante).filter((f): f is string => !!f))].sort(),
    [produtos]
  )

  const linhas = useMemo(() => {
    const estoquePorProduto = new Map<string, number>()
    for (const e of estoque) estoquePorProduto.set(e.produto_id, (estoquePorProduto.get(e.produto_id) ?? 0) + e.quantidade)
    const fechamentosPorProduto = new Map<string, FechamentoMensalProduto[]>()
    for (const f of fechamentos) fechamentosPorProduto.set(f.produto_id, [...(fechamentosPorProduto.get(f.produto_id) ?? []), f])

    return produtos
      .filter((p) => !fornecedorFiltro || p.fabricante === fornecedorFiltro)
      .map((p) => {
        const estoqueAtual = estoquePorProduto.get(p.id) ?? 0
        const mediaDiaria = calcularMediaDiaria(fechamentosPorProduto.get(p.id) ?? [])
        const sugestaoBase = calcularSugestaoPedido(estoqueAtual, mediaDiaria, config?.prazo_reposicao_dias ?? 0, config?.estoque_cobertura_dias ?? 0, config?.crescimento_estoque_pct ?? 0)
        const precoUltimo = ultimoPrecoCompra(loteItens, p.id)
        return { produto: p, estoqueAtual, mediaDiaria, sugestaoBase: sugestaoBase ?? 0, precoUltimo }
      })
      .sort((a, b) => (b.sugestaoBase - a.sugestaoBase) || a.produto.nome.localeCompare(b.produto.nome))
  }, [produtos, estoque, fechamentos, loteItens, config, fornecedorFiltro])

  function quantidadeDe(produtoId: string, sugestaoBase: number): number {
    const editado = quantidades[produtoId]
    return editado != null ? paraNumero(editado) : sugestaoBase
  }

  function precoDe(produtoId: string, precoUltimo: number | null): number {
    const editado = precos[produtoId]
    return editado != null ? paraNumero(editado) : (precoUltimo ?? 0)
  }

  const totalGeral = linhas.reduce((s, l) => s + quantidadeDe(l.produto.id, l.sugestaoBase) * precoDe(l.produto.id, l.precoUltimo), 0)

  function itensParaPedido() {
    return linhas
      .map((l) => ({
        produtoId: l.produto.id,
        nome: l.produto.nome,
        quantidade: quantidadeDe(l.produto.id, l.sugestaoBase),
        preco: precoDe(l.produto.id, l.precoUltimo),
      }))
      .filter((l) => l.quantidade > 0)
  }

  async function copiarPedido() {
    const itens = itensParaPedido()
    if (itens.length === 0) {
      toast.error('Nenhum produto com quantidade pra pedir.')
      return
    }

    const linhasTexto = [`Lista pedidos Elysiar - Leandro Soares Magalhães Lima - ${hojeFormatado()}`]
    if (plataforma) linhasTexto.push(`Plataforma: ${plataforma}`)
    if (fornecedorFiltro) linhasTexto.push(`Fornecedor: ${fornecedorFiltro}`)
    linhasTexto.push('')
    for (const item of itens) {
      linhasTexto.push(`${item.nome} - ${item.quantidade} - ${formatCurrency(item.preco)}`)
    }
    linhasTexto.push('')
    const total = itens.reduce((s, i) => s + i.quantidade * i.preco, 0)
    linhasTexto.push(`Total: ${formatCurrency(total)}`)

    try {
      await navigator.clipboard.writeText(linhasTexto.join('\n'))
      toast.success('Pedido copiado — cola no WhatsApp ou e-mail.')
    } catch {
      toast.error('Não deu pra copiar automaticamente. Selecione e copie o texto manualmente.')
    }
  }

  async function fazerPedido() {
    if (!fornecedorFiltro) {
      toast.error('Selecione um fornecedor antes de fazer o pedido.')
      return
    }
    const itens = itensParaPedido()
    if (itens.length === 0) {
      toast.error('Nenhum produto com quantidade pra pedir.')
      return
    }

    setFazendoPedido(true)

    const { count } = await supabase.from('lotes').select('*', { count: 'exact', head: true })
    const codigo = `Lote ${String((count ?? 0) + 1).padStart(3, '0')}`

    const { data: lote, error: erroLote } = await supabase
      .from('lotes')
      .insert({ codigo, fornecedor: fornecedorFiltro, data: new Date().toISOString().slice(0, 10), estoque_confirmado: false })
      .select()
      .single()

    if (erroLote || !lote) {
      setFazendoPedido(false)
      toast.error('Erro ao criar o lote desse pedido.')
      return
    }

    const { error: erroItens } = await supabase.from('lote_itens').insert(
      itens.map((i) => ({
        lote_id: lote.id,
        produto_id: i.produtoId,
        quantidade: i.quantidade,
        custo_unitario: i.preco,
      }))
    )
    setFazendoPedido(false)
    if (erroItens) {
      toast.error('Lote foi criado, mas não deu pra salvar os produtos. Confira em Lotes.')
      return
    }

    toast.success(`${codigo} criado — o estoque entra automaticamente quando a conta a pagar for quitada.`)
    setLoteCriado(lote as Lote)
    setContaPagarDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/lotes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Lotes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Sugestão de Pedido</h1>
        <p className="text-sm text-muted-foreground">
          Quanto pedir de cada produto com base no consumo real e no crescimento configurado. Ajuste quantidade e preço direto na tabela antes de copiar.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Fornecedor</Label>
          <Select
            value={fornecedorFiltro}
            onValueChange={(v) => setFornecedorFiltro(v ?? '')}
            items={{ '': 'Todos', ...Object.fromEntries(fornecedores.map((f) => [f, f])) }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Plataforma (pro pedido / designers)</Label>
          <Select
            value={plataforma}
            onValueChange={(v) => setPlataforma(v ?? '')}
            items={{ '': 'Não informar', ...Object.fromEntries(locaisMarketplace.map((l) => [l.nome, l.nome])) }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Não informar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Não informar</SelectItem>
              {locaisMarketplace.map((l) => (
                <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" onClick={copiarPedido}>
            <Copy className="h-4 w-4" />
            Copiar pedido
          </Button>
          <Button type="button" onClick={fazerPedido} disabled={fazendoPedido}>
            {fazendoPedido ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            Fazer Pedido
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        &quot;Fazer Pedido&quot; cria o lote (sem entrar estoque ainda) e abre o registro em Contas a Pagar — o estoque entra sozinho quando você marcar como pago.
      </p>

      <div className="rounded-lg border border-border overflow-x-auto">
        {linhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhum produto ativo pra esse fornecedor.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabricante</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Média/dia</TableHead>
                <TableHead className="text-right">Sugestão</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ produto: p, estoqueAtual, mediaDiaria, sugestaoBase, precoUltimo }) => {
                const qtd = quantidadeDe(p.id, sugestaoBase)
                const preco = precoDe(p.id, precoUltimo)
                return (
                  <TableRow key={p.id} className={qtd === 0 ? 'text-muted-foreground' : ''}>
                    <TableCell className="whitespace-nowrap">{p.fabricante ?? '—'}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{p.nome}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{estoqueAtual}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {mediaDiaria != null ? mediaDiaria.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Input
                        inputMode="numeric"
                        className="w-20 h-8 text-right ml-auto"
                        value={quantidades[p.id] ?? String(sugestaoBase)}
                        onChange={(e) => setQuantidades((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Input
                        inputMode="decimal"
                        className="w-24 h-8 text-right ml-auto"
                        value={precos[p.id] ?? (precoUltimo != null ? String(precoUltimo) : '')}
                        placeholder="0,00"
                        onChange={(e) => setPrecos((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">{formatCurrency(qtd * preco)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total do pedido</div>
          <div className="text-xl font-semibold">{formatCurrency(totalGeral)}</div>
        </div>
      </div>

      <NovaContaPagarDialog
        open={contaPagarDialogOpen}
        onOpenChange={setContaPagarDialogOpen}
        lotes={loteCriado ? [loteCriado] : []}
        loteInicial={loteCriado ? { id: loteCriado.id, codigo: loteCriado.codigo, fornecedor: loteCriado.fornecedor, valorTotal: totalGeral } : null}
        onSaved={() => { setLoteCriado(null); carregar() }}
      />
    </div>
  )
}
