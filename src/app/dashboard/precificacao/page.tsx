'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, CircleCheck, CircleAlert, CircleHelp } from 'lucide-react'
import { obterTarifaFba } from '@/lib/fba'
import { COR_FATURAMENTO, corMargem } from '@/lib/cores'
import type { CategoriaCusto, Configuracao, FaixaLogisticaFba, LocalEstoque, Lote, LoteCusto, LoteItem, Produto } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(v: number) {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export default function PrecificacaoPage() {
  const supabase = useMemo(() => createClient(), [])

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [faixasFba, setFaixasFba] = useState<FaixaLogisticaFba[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [localId, setLocalId] = useState('')
  const [loading, setLoading] = useState(true)

  const [custoProduto, setCustoProduto] = useState<number | null>(null)
  const [custosLogistica, setCustosLogistica] = useState<{ nome: string; valor: number }[]>([])
  const [semLote, setSemLote] = useState(false)
  const pedidoAtual = useRef<string | null>(null)

  useEffect(() => {
    async function carregarBase() {
      const [{ data: prods }, { data: locs }, { data: cfg }, { data: fxs }] = await Promise.all([
        supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
        supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
        supabase.from('configuracoes').select('*').single(),
        supabase.from('faixas_logistica_fba').select('*'),
      ])
      setProdutos((prods ?? []) as Produto[])
      setLocais((locs ?? []) as LocalEstoque[])
      setConfig(cfg as Configuracao)
      setFaixasFba((fxs ?? []) as FaixaLogisticaFba[])
      if (prods && prods.length > 0) setProdutoId(prods[0].id)
      if (locs && locs.length > 0) {
        const marketplace = locs.find((l) => l.tipo === 'marketplace')
        setLocalId((marketplace ?? locs[0]).id)
      }
      setLoading(false)
    }
    carregarBase()
  }, [supabase])

  const carregarCusto = useCallback(async (pid: string) => {
    if (!pid || pedidoAtual.current === pid) return
    pedidoAtual.current = pid
    setSemLote(false)
    setCustoProduto(null)
    setCustosLogistica([])

    // Lote mais recente que contém esse produto (data do lote; created_at como desempate)
    const { data: itens } = await supabase
      .from('lote_itens')
      .select('*, lote:lotes(*)')
      .eq('produto_id', pid)

    if (pedidoAtual.current !== pid) return

    const itensOrdenados = ((itens ?? []) as (LoteItem & { lote: Lote })[]).sort((a, b) => {
      const porData = new Date(b.lote.data).getTime() - new Date(a.lote.data).getTime()
      if (porData !== 0) return porData
      return new Date(b.lote.created_at).getTime() - new Date(a.lote.created_at).getTime()
    })

    if (itensOrdenados.length === 0) {
      setSemLote(true)
      return
    }

    const itemMaisRecente = itensOrdenados[0]

    const [{ data: todosItensDoLote }, { data: custosDoLote }] = await Promise.all([
      supabase.from('lote_itens').select('quantidade').eq('lote_id', itemMaisRecente.lote_id),
      supabase.from('lote_custos').select('*, categoria:categorias_custo(*)').eq('lote_id', itemMaisRecente.lote_id),
    ])

    if (pedidoAtual.current !== pid) return

    const totalUnidadesLote = (todosItensDoLote ?? []).reduce((s, i) => s + i.quantidade, 0)

    const porCategoria = ((custosDoLote ?? []) as (LoteCusto & { categoria: CategoriaCusto })[]).reduce<Record<string, number>>(
      (acc, c) => {
        const porUnidade = c.modo === 'por_unidade' ? c.valor : (totalUnidadesLote > 0 ? c.valor / totalUnidadesLote : 0)
        acc[c.categoria.nome] = (acc[c.categoria.nome] ?? 0) + porUnidade
        return acc
      },
      {}
    )

    setCustoProduto(itemMaisRecente.custo_unitario ?? 0)
    setCustosLogistica(Object.entries(porCategoria).map(([nome, valor]) => ({ nome, valor })))
  }, [supabase])

  useEffect(() => { if (produtoId) carregarCusto(produtoId) }, [produtoId, carregarCusto])

  const produto = produtos.find((p) => p.id === produtoId) ?? null
  const local = locais.find((l) => l.id === localId) ?? null

  const precoVenda = produto?.preco_venda ?? 0
  const impostoPct = (config?.imposto_percentual ?? 0) / 100
  const taxaPct = (local?.taxa_marketplace ?? 0) / 100
  const margemMinimaPct = (config?.margem_minima_percentual ?? 0) / 100

  const somaLogistica = custosLogistica.reduce((s, c) => s + c.valor, 0)
  const custoFixoTotal = (custoProduto ?? 0) + somaLogistica
  const valorImposto = precoVenda * impostoPct
  const valorTaxa = precoVenda * taxaPct

  const usaTarifaFba = local?.usa_tarifa_fba && local?.fba_logistica_ativa
  const pesoFaltando = usaTarifaFba && produto?.peso_gramas == null
  const tarifaFba = usaTarifaFba && produto?.peso_gramas != null && precoVenda > 0
    ? obterTarifaFba(produto.peso_gramas, precoVenda, faixasFba)
    : null
  const valorTarifaFba = tarifaFba ?? 0

  const lucro = precoVenda - custoFixoTotal - valorImposto - valorTaxa - valorTarifaFba
  const margem = precoVenda > 0 ? lucro / precoVenda : 0
  const margemOk = margem >= margemMinimaPct

  const denominador = 1 - margemMinimaPct - impostoPct - taxaPct
  const precoSugerido = denominador > 0 ? Math.ceil(((custoFixoTotal + valorTarifaFba) / denominador) * 100) / 100 : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Precificação</h1>
        <p className="text-muted-foreground text-sm">Cadastre um produto primeiro.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Precificação</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Produto</Label>
          <Select
            value={produtoId}
            onValueChange={(v) => setProdutoId(v ?? '')}
            items={Object.fromEntries(produtos.map((p) => [p.id, p.nome]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Local de venda</Label>
          <Select
            value={localId}
            onValueChange={(v) => setLocalId(v ?? '')}
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
      </div>

      {semLote ? (
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Esse produto ainda não entrou em nenhum lote — cadastre um lote pra calcular o custo.
        </div>
      ) : (
        <div className="rounded-lg border border-border p-4 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Custo Produto</span>
            <span>{formatCurrency(custoProduto ?? 0)}</span>
          </div>
          {custosLogistica.map((c) => (
            <div key={c.nome} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{c.nome}</span>
              <span>{formatCurrency(c.valor)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Imposto</span>
            <span>{formatPct((config?.imposto_percentual ?? 0))}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{usaTarifaFba ? 'Comissão' : 'Taxa Marketplace'}</span>
            <span>{formatPct((local?.taxa_marketplace ?? 0))}</span>
          </div>
          {usaTarifaFba && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tarifa Logística FBA</span>
              {pesoFaltando ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                  <CircleHelp className="h-3.5 w-3.5" /> cadastre o peso do produto
                </span>
              ) : (
                <span>{formatCurrency(valorTarifaFba)}</span>
              )}
            </div>
          )}

          <div className="pt-3 mt-2 border-t border-border space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço Atual</span>
              <span className={`font-medium ${COR_FATURAMENTO}`}>{formatCurrency(precoVenda)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lucro</span>
              <span className={`font-medium ${corMargem(margem * 100, config?.margem_minima_percentual ?? 0)}`}>{formatCurrency(lucro)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Margem</span>
              <span className={`font-medium ${corMargem(margem * 100, config?.margem_minima_percentual ?? 0)}`}>{formatPct(margem * 100)}</span>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-md text-sm font-medium ${
              margemOk ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}
          >
            {margemOk ? <CircleCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
            {margemOk ? 'Margem OK' : `Margem abaixo de ${formatPct(config?.margem_minima_percentual ?? 0)}`}
          </div>

          {!margemOk && precoSugerido != null && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Sugestão de venda: </span>
              <span className={`font-semibold ${COR_FATURAMENTO}`}>{formatCurrency(precoSugerido)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
