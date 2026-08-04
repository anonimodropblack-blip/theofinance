'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Wallet, Warehouse, TrendingUp, Percent, AlertTriangle, Boxes, Receipt, Search, ArrowUpDown, ClipboardList, ShoppingCart, Tag, RefreshCw, Megaphone, Gauge, Rocket, HandCoins, PiggyBank, Landmark, CalendarCheck, Store, Factory, ChevronRight, PackageCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiIcon } from '@/components/dashboard/KpiIcon'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { calcularProjecao, calcularProjecaoTotal } from '@/lib/produtos-projecao'
import { calcularPrecificacao } from '@/lib/precificacao'
import { calcularCustoRealPorProduto, type LoteCustoComCategoria, type LoteItemComLote } from '@/lib/custo-real'
import { COR_FATURAMENTO, corMargem } from '@/lib/cores'
import { calcularAlocacaoCaixinhas, calcularProlabore } from '@/lib/prolabore'
import { primeiroDiaMesAtualISO, saldoPorConta, totalRetiradoNoPeriodo } from '@/lib/financeiro'
import { agruparVendasCanal, totalVendasProduto } from '@/lib/vendas-canal'
import { LancamentoDialog } from '@/components/financeiro/lancamento-dialog'
import { toast } from 'sonner'
import type { Caixinha, CategoriaFinanceira, Configuracao, Estoque, FaixaLogisticaFba, FaixaTaxaMarketplacePreco, FechamentoMensal, LancamentoFinanceiro, LocalEstoque, Lote, Pedido, Produto, VendaMesCanal } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(v: number) {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function formatPctNullable(v: number | null) {
  if (v == null) return '—'
  return formatPct(v)
}

function formatCurrencyNullable(v: number | null) {
  if (v == null) return '—'
  return formatCurrency(v)
}

function formatRoas(v: number | null) {
  if (v == null) return '—'
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x`
}

type OrdemColuna = 'margem' | 'vendasMes' | 'lucroMes'

function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function primeiroDiaMesPassadoISO() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

function ultimoDiaMesPassadoISO() {
  const d = new Date()
  d.setDate(0)
  return d.toISOString().slice(0, 10)
}

function ha30DiasISO() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [periodoInicio, setPeriodoInicio] = useState(primeiroDiaMesAtualISO())
  const [periodoFim, setPeriodoFim] = useState(hojeISO())

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [estoque, setEstoque] = useState<Estoque[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteItens, setLoteItens] = useState<LoteItemComLote[]>([])
  const [loteCustos, setLoteCustos] = useState<LoteCustoComCategoria[]>([])
  const [faixasFba, setFaixasFba] = useState<FaixaLogisticaFba[]>([])
  const [faixasPreco, setFaixasPreco] = useState<FaixaTaxaMarketplacePreco[]>([])
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([])
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<CategoriaFinanceira[]>([])
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [vendasCanal, setVendasCanal] = useState<Record<string, Record<string, number>>>({})
  const [fechamentoAtual, setFechamentoAtual] = useState<FechamentoMensal | null>(null)
  const [fechando, setFechando] = useState(false)
  const [aplicandoAlocacao, setAplicandoAlocacao] = useState(false)
  const [retiradaDialogOpen, setRetiradaDialogOpen] = useState(false)

  const [relatorioBusca, setRelatorioBusca] = useState('')
  const [relatorioOrdem, setRelatorioOrdem] = useState<OrdemColuna>('margem')
  const [relatorioDesc, setRelatorioDesc] = useState(true)

  const carregar = useCallback(async () => {
    const [
      { data: prods },
      { data: locs },
      { data: cfg },
      { data: est },
      { data: lts },
      { data: itens },
      { data: custos },
      { data: fxsFba },
      { data: fxsPreco },
      { data: cxs },
      { data: catsFin },
      { data: lancs },
      { data: peds },
      { data: vendasCanalData },
      { data: fechamento },
    ] = await Promise.all([
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
      supabase.from('configuracoes').select('*').single(),
      supabase.from('estoque').select('*'),
      supabase.from('lotes').select('*').order('data', { ascending: false }),
      supabase.from('lote_itens').select('*, lote:lotes(*)'),
      supabase.from('lote_custos').select('*, categoria:categorias_custo(*)'),
      supabase.from('faixas_logistica_fba').select('*'),
      supabase.from('faixas_taxa_marketplace_preco').select('*'),
      supabase.from('caixinhas').select('*').eq('ativo', true).order('ordem'),
      supabase.from('categorias_financeiras').select('*').order('nome'),
      supabase.from('lancamentos_financeiros').select('*'),
      supabase.from('pedidos').select('*'),
      supabase.from('vendas_mes_canal').select('*'),
      supabase.from('fechamentos_mensais').select('*').eq('mes_referencia', primeiroDiaMesAtualISO()).maybeSingle(),
    ])

    setProdutos((prods ?? []) as Produto[])
    setLocais((locs ?? []) as LocalEstoque[])
    setConfig(cfg as Configuracao)
    setEstoque((est ?? []) as Estoque[])
    setLotes((lts ?? []) as Lote[])
    setLoteItens((itens ?? []) as LoteItemComLote[])
    setLoteCustos((custos ?? []) as LoteCustoComCategoria[])
    setFaixasPreco((fxsPreco ?? []) as FaixaTaxaMarketplacePreco[])
    setFaixasFba(
      ((fxsFba ?? []) as FaixaLogisticaFba[]).sort((a, b) => {
        if (a.peso_min !== b.peso_min) return a.peso_min - b.peso_min
        return a.preco_min - b.preco_min
      })
    )
    setCaixinhas((cxs ?? []) as Caixinha[])
    setCategoriasFinanceiras((catsFin ?? []) as CategoriaFinanceira[])
    setLancamentos((lancs ?? []) as LancamentoFinanceiro[])
    setPedidos((peds ?? []) as Pedido[])
    setVendasCanal(agruparVendasCanal((vendasCanalData ?? []) as VendaMesCanal[]))
    setFechamentoAtual((fechamento ?? null) as FechamentoMensal | null)
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  async function atualizar() {
    setAtualizando(true)
    await carregar()
    setAtualizando(false)
  }

  // total de unidades por lote (converte custos "por_unidade" -> total do lote) — usado
  // tanto pro investimento logístico quanto pro custo atual por produto abaixo.
  const unidadesPorLote = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const item of loteItens) {
      mapa.set(item.lote_id, (mapa.get(item.lote_id) ?? 0) + item.quantidade)
    }
    return mapa
  }, [loteItens])

  // custo atual por produto: lote mais recente que contém aquele produto (mesmo critério
  // da Precificação) — extraído do cálculo de KPIs pra também alimentar o Lucro Real
  // (calculado a partir dos pedidos reais lançados, não da projeção).
  const custoAtualPorProduto = useMemo(() => {
    const custoLogisticaPorLote = new Map<string, number>()
    for (const c of loteCustos) {
      const totalLote = unidadesPorLote.get(c.lote_id) ?? 0
      const porUnidade = c.modo === 'por_unidade' ? c.valor : (totalLote > 0 ? c.valor / totalLote : 0)
      custoLogisticaPorLote.set(c.lote_id, (custoLogisticaPorLote.get(c.lote_id) ?? 0) + porUnidade)
    }

    const itensPorProduto = new Map<string, LoteItemComLote[]>()
    for (const item of loteItens) {
      const lista = itensPorProduto.get(item.produto_id) ?? []
      lista.push(item)
      itensPorProduto.set(item.produto_id, lista)
    }

    const mapa = new Map<string, number>()
    for (const [produtoId, itens] of itensPorProduto) {
      const maisRecente = [...itens].sort((a, b) => {
        const porData = new Date(b.lote.data).getTime() - new Date(a.lote.data).getTime()
        if (porData !== 0) return porData
        return new Date(b.lote.created_at).getTime() - new Date(a.lote.created_at).getTime()
      })[0]
      const custoProduto = maisRecente.custo_unitario ?? 0
      const custoLogistica = custoLogisticaPorLote.get(maisRecente.lote_id) ?? 0
      mapa.set(produtoId, custoProduto + custoLogistica)
    }
    return mapa
  }, [loteItens, loteCustos, unidadesPorLote])

  const vendasReaisMes = useMemo(() => {
    const doPeriodo = pedidos.filter((p) => p.data >= periodoInicio && p.data <= periodoFim)
    const faturamentoReal = doPeriodo.reduce((s, p) => s + p.quantidade * p.preco_unitario, 0)
    const custoReal = doPeriodo.reduce((s, p) => s + p.quantidade * (custoAtualPorProduto.get(p.produto_id) ?? 0), 0)
    return { faturamentoReal, custoReal, lucroReal: faturamentoReal - custoReal }
  }, [pedidos, custoAtualPorProduto, periodoInicio, periodoFim])

  const operacao = useMemo(() => {
    const estoquePorProduto = new Map<string, number>()
    for (const e of estoque) {
      estoquePorProduto.set(e.produto_id, (estoquePorProduto.get(e.produto_id) ?? 0) + e.quantidade)
    }

    const ultimaVendaPorProduto = new Map<string, string>()
    for (const p of pedidos) {
      const atual = ultimaVendaPorProduto.get(p.produto_id)
      if (!atual || p.data > atual) ultimaVendaPorProduto.set(p.produto_id, p.data)
    }

    const DIAS_PARADO = 45
    const limite = new Date()
    limite.setDate(limite.getDate() - DIAS_PARADO)
    const limiteISO = limite.toISOString().slice(0, 10)
    const hojeISO = new Date().toISOString().slice(0, 10)

    const produtosAtivos = produtos.filter((p) => p.status === 'ativo')
    const produtosEmEstoqueCount = produtosAtivos.filter((p) => (estoquePorProduto.get(p.id) ?? 0) > 0).length

    const criticos = produtosAtivos.filter((p) => p.qtd_minima != null && (estoquePorProduto.get(p.id) ?? 0) < p.qtd_minima)
    const semFabricante = produtosAtivos.filter((p) => !p.fabricante)
    const semPreco = produtosAtivos.filter((p) => p.preco_venda == null)
    const parados = produtosAtivos.filter((p) => {
      const qtd = estoquePorProduto.get(p.id) ?? 0
      if (qtd <= 0) return false
      const ultimaVenda = ultimaVendaPorProduto.get(p.id)
      return !ultimaVenda || ultimaVenda < limiteISO
    })
    const capitalParado = parados.reduce((s, p) => s + (custoAtualPorProduto.get(p.id) ?? 0) * (estoquePorProduto.get(p.id) ?? 0), 0)
    const pedidosHoje = pedidos.filter((p) => p.data === hojeISO).length
    const prolaboreRetiradoEsteMes = lancamentos.some((l) => l.retirada && l.data.slice(0, 7) === primeiroDiaMesAtualISO().slice(0, 7))

    const alertas: { texto: string; href: string; icon: LucideIcon }[] = []
    if (criticos.length > 0) {
      alertas.push({
        texto: `${criticos.length} produto${criticos.length === 1 ? '' : 's'} abaixo do estoque mínimo`,
        href: '/dashboard/produtos',
        icon: AlertTriangle,
      })
    }
    if (semFabricante.length > 0) {
      alertas.push({
        texto: `${semFabricante.length} produto${semFabricante.length === 1 ? '' : 's'} sem fabricante vinculado`,
        href: '/dashboard/produtos',
        icon: Factory,
      })
    }
    if (semPreco.length > 0) {
      alertas.push({
        texto: `${semPreco.length} produto${semPreco.length === 1 ? '' : 's'} sem preço de venda definido`,
        href: '/dashboard/produtos',
        icon: Tag,
      })
    }
    if (parados.length > 0) {
      alertas.push({
        texto: `${parados.length} produto${parados.length === 1 ? '' : 's'} parado${parados.length === 1 ? '' : 's'} há mais de ${DIAS_PARADO} dias (${formatCurrency(capitalParado)} em custo parado)`,
        href: '/dashboard/produtos',
        icon: PackageCheck,
      })
    }
    if (!prolaboreRetiradoEsteMes) {
      alertas.push({
        texto: 'Pró-labore ainda não foi retirado este mês',
        href: '/dashboard/financeiro',
        icon: HandCoins,
      })
    }

    return { produtosEmEstoqueCount, criticosCount: criticos.length, capitalParado, pedidosHoje, alertas }
  }, [produtos, estoque, pedidos, lancamentos, custoAtualPorProduto])

  const kpis = useMemo(() => {
    if (!config) return null

    const margemMinimaPct = (config.margem_minima_percentual ?? 0) / 100
    const localPorId = new Map(locais.map((l) => [l.id, l]))
    const produtoPorId = new Map(produtos.map((p) => [p.id, p]))

    // investimento total histórico: custo de mercadoria + custos logísticos de todos os lotes
    const investimentoMercadoria = loteItens.reduce((s, i) => s + (i.custo_unitario ?? 0) * i.quantidade, 0)
    const investimentoLogistica = loteCustos.reduce((s, c) => {
      const totalLote = unidadesPorLote.get(c.lote_id) ?? 0
      return s + (c.modo === 'total' ? c.valor : c.valor * totalLote)
    }, 0)
    const investimentoTotal = investimentoMercadoria + investimentoLogistica

    // estoque total (unidades + valor ao custo atual)
    let estoqueUnidades = 0
    let estoqueValor = 0
    for (const e of estoque) {
      estoqueUnidades += e.quantidade
      const custo = custoAtualPorProduto.get(e.produto_id)
      if (custo != null) estoqueValor += custo * e.quantidade
    }

    // faturamento bruto + lucro líquido projetado + margem média (ponderada por estoque, já líquida) + produtos abaixo da margem
    const totalVendasMesKpi = produtos.reduce((s, p) => s + (p.status === 'ativo' ? totalVendasProduto(vendasCanal, p.id) : 0), 0)
    const adsDiluidoPorUnidadeKpi = totalVendasMesKpi > 0 ? (config.gasto_ads_mensal ?? 0) / totalVendasMesKpi : 0
    // estoque parado em "Casa" (próprio) ainda não tem taxa de marketplace real — projeta
    // como se fosse vender no marketplace padrão, senão a conta ficava sem desconto de
    // comissão/tarifa nenhum pra tudo que ainda está em casa esperando envio.
    const localPadraoKpi = locais.find((l) => l.usa_tarifa_fba) ?? locais.find((l) => l.tipo === 'marketplace') ?? null

    let faturamentoBruto = 0
    let lucroProjetado = 0
    let margemPonderadaSoma = 0
    let pesoTotal = 0
    const produtosAbaixo = new Set<string>()

    for (const e of estoque) {
      if (e.quantidade <= 0) continue
      const produto = produtoPorId.get(e.produto_id)
      const custoFixoTotal = custoAtualPorProduto.get(e.produto_id)
      if (!produto || produto.preco_venda == null) continue

      faturamentoBruto += produto.preco_venda * e.quantidade
      if (custoFixoTotal == null) continue

      const localReal = localPorId.get(e.local_id) ?? null
      const local = localReal?.tipo === 'marketplace' ? localReal : localPadraoKpi
      const usandoAdsDiluidoKpi = produto.ads_modo == null && adsDiluidoPorUnidadeKpi > 0
      const r = calcularPrecificacao({
        precoVenda: produto.preco_venda,
        pesoGramas: produto.peso_gramas,
        custoFixoTotal,
        local,
        faixasFba,
        faixasPreco,
        impostoPercentual: config.imposto_percentual ?? 0,
        margemMinimaPercentual: config.margem_minima_percentual ?? 0,
        adsModo: produto.ads_modo ?? (usandoAdsDiluidoKpi ? 'valor' : null),
        adsValor: produto.ads_modo != null ? produto.ads_valor : adsDiluidoPorUnidadeKpi,
      })

      lucroProjetado += r.lucro * e.quantidade
      margemPonderadaSoma += r.margem * e.quantidade
      pesoTotal += e.quantidade

      if (r.margem < margemMinimaPct) produtosAbaixo.add(produto.id)
    }

    const margemMedia = pesoTotal > 0 ? margemPonderadaSoma / pesoTotal : 0

    // pedidos/mês, ticket médio e gasto com ads: aproximados a partir de Vendas/Mês
    // (estimativa manual por produto) — o sistema não registra pedidos individuais.
    // Ads: cada produto pode ter seu próprio Ads (% ou R$/un, definido em Produtos);
    // pro que não tem, cai no gasto mensal geral de Configurações diluído por unidade
    // (mesmo critério usado na Precificação/Relatório de Produtos).
    let faturamentoMensal = 0
    let pedidosMes = 0
    let gastoAdsMensal = 0
    for (const p of produtos) {
      const vendasMesProduto = totalVendasProduto(vendasCanal, p.id)
      if (p.preco_venda == null || vendasMesProduto === 0) continue
      faturamentoMensal += p.preco_venda * vendasMesProduto
      pedidosMes += vendasMesProduto

      const adsPct = p.ads_modo === 'percentual' ? (p.ads_valor ?? 0) / 100 : 0
      const adsFixo = p.ads_modo === 'valor' ? (p.ads_valor ?? 0) : 0
      const adsPorUnidade = p.ads_modo != null ? p.preco_venda * adsPct + adsFixo : adsDiluidoPorUnidadeKpi
      gastoAdsMensal += adsPorUnidade * vendasMesProduto
    }
    const ticketMedio = pedidosMes > 0 ? faturamentoMensal / pedidosMes : 0

    // TACoS = % do faturamento mensal gasto em ads; ROAS = quanto o faturamento
    // retorna pra cada real gasto em ads.
    const tacosPct = faturamentoMensal > 0 ? (gastoAdsMensal / faturamentoMensal) * 100 : null
    const roas = gastoAdsMensal > 0 ? faturamentoMensal / gastoAdsMensal : null

    return {
      investimentoMercadoria,
      investimentoTotal,
      estoqueUnidades,
      estoqueValor,
      faturamentoBruto,
      lucroProjetado,
      margemMedia,
      temEstoqueComMargem: pesoTotal > 0,
      produtosAbaixoCount: produtosAbaixo.size,
      pedidosMes,
      ticketMedio,
      gastoAdsMensal,
      tacosPct,
      roas,
    }
  }, [config, locais, produtos, estoque, loteItens, loteCustos, faixasFba, faixasPreco, vendasCanal, unidadesPorLote, custoAtualPorProduto])

  const financeiroInfo = useMemo(() => {
    if (!config) return null
    const impostoPercentual = config.imposto_percentual ?? 0
    const margemMinimaPercentual = config.margem_minima_percentual ?? 0
    const locaisPorId = new Map(locais.map((l) => [l.id, l]))
    const custoRealPorProduto = calcularCustoRealPorProduto(loteItens, loteCustos)
    const totalVendasMes = produtos.reduce((s, p) => s + totalVendasProduto(vendasCanal, p.id), 0)
    const adsDiluidoPorUnidade = totalVendasMes > 0 ? (config.gasto_ads_mensal ?? 0) / totalVendasMes : 0

    const lucroLiquidoMensal = produtos.reduce((s, p) => {
      const { lucroMes } = calcularProjecaoTotal(p, custoRealPorProduto[p.id] ?? null, vendasCanal[p.id] ?? {}, locaisPorId, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
      return s + lucroMes
    }, 0)

    const lucroBaseProlabore = config.prolabore_descontar_custo_fixo ? lucroLiquidoMensal - (config.custo_fixo_mensal ?? 0) : lucroLiquidoMensal
    const prolaboreCalculado = calcularProlabore(lucroBaseProlabore, config.prolabore_alvo, config.prolabore_pct_excedente)
    const retiradoNoPeriodo = totalRetiradoNoPeriodo(lancamentos, periodoInicio, periodoFim)
    const saldo = saldoPorConta(lancamentos)
    const alocacaoSugerida = calcularAlocacaoCaixinhas(lucroBaseProlabore - prolaboreCalculado, caixinhas)

    return { lucroLiquidoMensal, lucroBaseProlabore, prolaboreCalculado, retiradoNoPeriodo, saldo, alocacaoSugerida }
  }, [config, locais, produtos, loteItens, loteCustos, faixasFba, faixasPreco, lancamentos, caixinhas, vendasCanal, periodoInicio, periodoFim])

  async function aplicarAlocacaoCaixinhas() {
    if (!financeiroInfo || financeiroInfo.alocacaoSugerida.length === 0) return
    const { data: categoriaCaixinha } = await supabase.from('categorias_financeiras').select('id').eq('nome', 'Caixinha').single()
    const linhas = financeiroInfo.alocacaoSugerida
      .filter((a) => a.valor > 0)
      .map((a) => ({
        tipo: 'saida' as const,
        conta: a.caixinha.conta_destino,
        categoria_id: categoriaCaixinha?.id ?? null,
        descricao: a.caixinha.nome,
        caixinha_id: a.caixinha.id,
        valor: a.valor,
        data: new Date().toISOString().slice(0, 10),
      }))
    if (linhas.length === 0) return
    setAplicandoAlocacao(true)
    const { error } = await supabase.from('lancamentos_financeiros').insert(linhas)
    setAplicandoAlocacao(false)
    if (error) {
      toast.error('Erro ao registrar a divisão.')
      return
    }
    toast.success(`Divisão registrada em ${linhas.length} caixinha${linhas.length === 1 ? '' : 's'}`)
    carregar()
  }

  const ultimosLotes = useMemo(() => {
    const qtdPorLote = new Map<string, number>()
    for (const item of loteItens) {
      qtdPorLote.set(item.lote_id, (qtdPorLote.get(item.lote_id) ?? 0) + item.quantidade)
    }
    return lotes.slice(0, 5).map((l) => ({ ...l, quantidade: qtdPorLote.get(l.id) ?? 0 }))
  }, [lotes, loteItens])

  // Base sem filtro de busca — usada tanto pelo Relatório de Produtos (filtrado/ordenado
  // abaixo) quanto pelo fechamento mensal (precisa de TODOS os produtos, não só os que
  // batem com a busca digitada no momento).
  const projecaoTodosProdutos = useMemo(() => {
    const impostoPercentual = config?.imposto_percentual ?? 0
    const margemMinimaPercentual = config?.margem_minima_percentual ?? 0
    const locaisPorId = new Map(locais.map((l) => [l.id, l]))
    const custoRealPorProduto = calcularCustoRealPorProduto(loteItens, loteCustos)
    const totalVendasMes = produtos.reduce((s, p) => s + (p.status === 'ativo' ? totalVendasProduto(vendasCanal, p.id) : 0), 0)
    const adsDiluidoPorUnidade = totalVendasMes > 0 ? (config?.gasto_ads_mensal ?? 0) / totalVendasMes : 0

    return produtos.map((p) => {
      const { lucroMes, vendasQtd, faturamento } = calcularProjecaoTotal(p, custoRealPorProduto[p.id] ?? null, vendasCanal[p.id] ?? {}, locaisPorId, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
      const margemPct = faturamento > 0 ? (lucroMes / faturamento) * 100 : null
      return { produto: p, margemPct, lucroMes, vendasQtd, faturamento }
    })
  }, [produtos, config, locais, loteItens, loteCustos, faixasFba, faixasPreco, vendasCanal])

  const relatorioProdutos = useMemo(() => {
    const q = relatorioBusca.toLowerCase()
    const filtradas = q
      ? projecaoTodosProdutos.filter((l) => l.produto.nome.toLowerCase().includes(q) || (l.produto.fabricante ?? '').toLowerCase().includes(q))
      : projecaoTodosProdutos

    const chave = (l: (typeof filtradas)[number]) => {
      if (relatorioOrdem === 'vendasMes') return l.vendasQtd
      if (relatorioOrdem === 'lucroMes') return l.lucroMes
      return l.margemPct ?? -Infinity
    }

    return [...filtradas].sort((a, b) => (chave(b) - chave(a)) * (relatorioDesc ? 1 : -1))
  }, [projecaoTodosProdutos, relatorioBusca, relatorioOrdem, relatorioDesc])

  // Mesma projeção, agregada por canal em vez de por produto — alimenta o pivot Canal x
  // Mês do Histórico e o fechamento mensal.
  const relatorioCanais = useMemo(() => {
    const impostoPercentual = config?.imposto_percentual ?? 0
    const margemMinimaPercentual = config?.margem_minima_percentual ?? 0
    const locaisPorId = new Map(locais.map((l) => [l.id, l]))
    const custoRealPorProduto = calcularCustoRealPorProduto(loteItens, loteCustos)
    const totalVendasMes = produtos.reduce((s, p) => s + (p.status === 'ativo' ? totalVendasProduto(vendasCanal, p.id) : 0), 0)
    const adsDiluidoPorUnidade = totalVendasMes > 0 ? (config?.gasto_ads_mensal ?? 0) / totalVendasMes : 0

    const porCanal = new Map<string, { vendasQtd: number; faturamento: number; lucro: number }>()
    for (const p of produtos) {
      const custoReal = custoRealPorProduto[p.id] ?? null
      for (const [localId, qtd] of Object.entries(vendasCanal[p.id] ?? {})) {
        if (qtd <= 0) continue
        const local = locaisPorId.get(localId) ?? null
        const r = calcularProjecao(p, custoReal, local, qtd, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
        const atual = porCanal.get(localId) ?? { vendasQtd: 0, faturamento: 0, lucro: 0 }
        atual.vendasQtd += qtd
        atual.faturamento += (p.preco_venda ?? 0) * qtd
        atual.lucro += r.lucroMes ?? 0
        porCanal.set(localId, atual)
      }
    }
    return [...porCanal.entries()].flatMap(([localId, v]) => {
      const local = locaisPorId.get(localId)
      return local ? [{ local, ...v }] : []
    })
  }, [produtos, config, locais, loteItens, loteCustos, faixasFba, faixasPreco, vendasCanal])

  const dadosCanal = useMemo(
    () =>
      [...relatorioCanais]
        .sort((a, b) => b.faturamento - a.faturamento)
        .map((c) => ({ nome: c.local.nome, faturamento: c.faturamento })),
    [relatorioCanais]
  )

  const nomeMesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function fecharMes() {
    if (!kpis) return
    if (fechamentoAtual && !window.confirm(`${nomeMesAtual} já foi fechado em ${formatData(fechamentoAtual.fechado_em.slice(0, 10))}. Fechar de novo substitui esse snapshot. Continuar?`)) return

    setFechando(true)
    if (fechamentoAtual) {
      await supabase.from('fechamentos_mensais').delete().eq('id', fechamentoAtual.id)
    }

    const { data: novo, error } = await supabase.from('fechamentos_mensais').insert({
      mes_referencia: primeiroDiaMesAtualISO(),
      faturamento_bruto: kpis.faturamentoBruto,
      lucro_liquido: financeiroInfo?.lucroLiquidoMensal ?? 0,
      gasto_ads: kpis.gastoAdsMensal,
      investimento_total: kpis.investimentoTotal,
      estoque_valor: kpis.estoqueValor,
    }).select('id').single()

    if (error || !novo) {
      toast.error('Erro ao fechar o mês.')
      setFechando(false)
      return
    }

    const linhasProdutos = projecaoTodosProdutos
      .filter((l) => l.vendasQtd > 0 || l.faturamento > 0)
      .map((l) => ({
        fechamento_id: novo.id,
        produto_id: l.produto.id,
        produto_nome: l.produto.nome,
        vendas_qtd: l.vendasQtd,
        faturamento: l.faturamento,
        lucro: l.lucroMes,
        margem_pct: l.margemPct,
      }))
    const linhasCanais = relatorioCanais.map((c) => ({
      fechamento_id: novo.id,
      local_id: c.local.id,
      local_nome: c.local.nome,
      vendas_qtd: c.vendasQtd,
      faturamento: c.faturamento,
      lucro: c.lucro,
    }))

    await Promise.all([
      linhasProdutos.length > 0 ? supabase.from('fechamentos_mensais_produtos').insert(linhasProdutos) : Promise.resolve(),
      linhasCanais.length > 0 ? supabase.from('fechamentos_mensais_canais').insert(linhasCanais) : Promise.resolve(),
    ])

    setFechando(false)
    toast.success(`${nomeMesAtual} fechado com sucesso`)
    carregar()
  }

  function ordenarPor(coluna: OrdemColuna) {
    if (relatorioOrdem === coluna) {
      setRelatorioDesc((d) => !d)
    } else {
      setRelatorioOrdem(coluna)
      setRelatorioDesc(true)
    }
  }

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação agora</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-1 text-xs">
            <button
              type="button"
              onClick={() => { setPeriodoInicio(primeiroDiaMesAtualISO()); setPeriodoFim(hojeISO()) }}
              className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Este mês
            </button>
            <button
              type="button"
              onClick={() => { setPeriodoInicio(primeiroDiaMesPassadoISO()); setPeriodoFim(ultimoDiaMesPassadoISO()) }}
              className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Mês passado
            </button>
            <button
              type="button"
              onClick={() => { setPeriodoInicio(ha30DiasISO()); setPeriodoFim(hojeISO()) }}
              className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Últimos 30 dias
            </button>
          </div>
          <Input type="date" className="h-8 w-[9.5rem]" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" className="h-8 w-[9.5rem]" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={atualizar} disabled={atualizando}>
            <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Resumo da Operação — os números que respondem "como a empresa está agora" */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Resumo da Operação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/dashboard/precificacao" className="block">
            <Card className="relative overflow-hidden transition-colors hover:border-primary/30">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                  <KpiIcon icon={Receipt} tone="blue" /> Faturamento Bruto
                </CardTitle>
              </CardHeader>
              <CardContent className={`relative text-3xl font-semibold tracking-tight ${COR_FATURAMENTO}`}>
                {formatCurrency(kpis.faturamentoBruto)}
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/precificacao" className="block">
            <Card className="relative overflow-hidden transition-colors hover:border-primary/30">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-success/25 blur-3xl" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                  <KpiIcon icon={TrendingUp} tone="green" /> Lucro Líquido Projetado
                </CardTitle>
              </CardHeader>
              <CardContent className={`relative text-3xl font-semibold tracking-tight ${kpis.temEstoqueComMargem ? corMargem(kpis.margemMedia * 100, config?.margem_minima_percentual ?? 0) : ''}`}>
                {formatCurrency(kpis.lucroProjetado)}
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/financeiro" className="block">
            <Card className="relative overflow-hidden transition-colors hover:border-primary/30">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-chart-5/25 blur-3xl" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                  <KpiIcon icon={Landmark} tone="violet" /> Saldo Operacional
                </CardTitle>
              </CardHeader>
              <CardContent className="relative text-3xl font-semibold tracking-tight">
                {formatCurrency(financeiroInfo?.saldo.operacional ?? 0)}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {operacao.alertas.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Central de Alertas
          </h2>
          <Card className="py-1">
            <div className="divide-y divide-border">
              {operacao.alertas.map((alerta, i) => (
                <Link
                  key={i}
                  href={alerta.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <alerta.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">{alerta.texto}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ShoppingCart className="h-4 w-4" /> Vendas Reais no Período
            <span className="font-normal text-xs text-muted-foreground">({formatData(periodoInicio)} – {formatData(periodoFim)})</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            A partir dos pedidos lançados nesse período — diferente da projeção acima, que usa o ritmo atual de vendas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/dashboard/pedidos" className="block">
            <Card size="sm" className="transition-colors hover:border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                  <KpiIcon icon={Receipt} tone="blue" /> Faturamento Real
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tracking-tight">{formatCurrency(vendasReaisMes.faturamentoReal)}</CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/pedidos" className="block">
            <Card size="sm" className="transition-colors hover:border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                  <KpiIcon icon={TrendingUp} tone="green" /> Lucro Real
                </CardTitle>
              </CardHeader>
              <CardContent className={`text-2xl font-semibold tracking-tight ${vendasReaisMes.lucroReal < 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(vendasReaisMes.lucroReal)}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {dadosCanal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
              <KpiIcon icon={Store} tone="violet" /> Faturamento por Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosCanal} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={110}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--popover-foreground)' }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Bar dataKey="faturamento" radius={[0, 6, 6, 0]} barSize={22}>
                  {dadosCanal.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Grade secundária — o resto do contexto, mais discreto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/dashboard/produtos" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={Wallet} tone="blue" /> Investimento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatCurrency(kpis.investimentoTotal)}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(kpis.investimentoMercadoria)} só em produtos</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/estoque" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={Warehouse} tone="amber" /> Estoque Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{kpis.estoqueUnidades} un.</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(kpis.estoqueValor)} em custo</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/estoque" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={PackageCheck} tone="blue" /> Produtos em Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{operacao.produtosEmEstoqueCount}</CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/produtos" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={AlertTriangle} tone="red" /> Produtos Críticos
              </CardTitle>
            </CardHeader>
            <CardContent className={`text-lg font-semibold ${operacao.criticosCount > 0 ? 'text-destructive' : ''}`}>
              {operacao.criticosCount} produto{operacao.criticosCount === 1 ? '' : 's'}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/produtos" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={Boxes} tone="amber" /> Capital Parado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatCurrency(operacao.capitalParado)}</div>
              <div className="text-xs text-muted-foreground">produtos sem venda há 45+ dias</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/precificacao" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={Percent} tone="green" /> Margem Média
              </CardTitle>
            </CardHeader>
            <CardContent className={`text-lg font-semibold ${kpis.temEstoqueComMargem ? corMargem(kpis.margemMedia * 100, config?.margem_minima_percentual ?? 0) : ''}`}>
              {kpis.temEstoqueComMargem ? formatPct(kpis.margemMedia * 100) : '—'}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/precificacao" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={AlertTriangle} tone="red" /> Abaixo da Margem
              </CardTitle>
            </CardHeader>
            <CardContent className={`text-lg font-semibold ${kpis.produtosAbaixoCount > 0 ? 'text-destructive' : ''}`}>
              {kpis.produtosAbaixoCount} produto{kpis.produtosAbaixoCount === 1 ? '' : 's'}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/pedidos" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={ShoppingCart} tone="blue" /> Pedidos do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{operacao.pedidosHoje}</CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/pedidos" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={ShoppingCart} tone="blue" /> Pedidos/Mês (estimado)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{kpis.pedidosMes}</CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/pedidos" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={Tag} tone="green" /> Ticket Médio (estimado)
              </CardTitle>
            </CardHeader>
            <CardContent className={`text-lg font-semibold ${COR_FATURAMENTO}`}>{formatCurrency(kpis.ticketMedio)}</CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/financeiro" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={PiggyBank} tone="violet" /> Saldo Reserva/CDB
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{formatCurrency(financeiroInfo?.saldo.reserva ?? 0)}</CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/configuracoes" className="block">
          <Card size="sm" className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                <KpiIcon icon={Receipt} tone="red" /> Custo Fixo Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatCurrency(config?.custo_fixo_mensal ?? 0)}</div>
              <div className="text-xs text-muted-foreground">assinaturas/mensalidades de marketplace</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {kpis.gastoAdsMensal > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Megaphone className="h-4 w-4" /> Ads
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/dashboard/produtos" className="block">
              <Card size="sm" className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                    <KpiIcon icon={Wallet} tone="violet" /> Gasto com Ads (mês)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatCurrency(kpis.gastoAdsMensal)}</CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/produtos" className="block">
              <Card size="sm" className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                    <KpiIcon icon={Gauge} tone="amber" /> TACoS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{formatPctNullable(kpis.tacosPct)}</div>
                  <div className="text-xs text-muted-foreground">% do faturamento gasto em ads</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/produtos" className="block">
              <Card size="sm" className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                    <KpiIcon icon={Rocket} tone="green" /> ROAS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{formatRoas(kpis.roas)}</div>
                  <div className="text-xs text-muted-foreground">retorno pra cada R$ 1 em ads</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      <Card size="sm" className="flex-row items-center justify-between gap-3 flex-wrap px-4">
        <div>
          <p className="text-sm font-medium capitalize">Fechamento de {nomeMesAtual}</p>
          <p className="text-xs text-muted-foreground">
            {fechamentoAtual
              ? `Fechado em ${formatData(fechamentoAtual.fechado_em.slice(0, 10))} — fechar de novo substitui esse snapshot.`
              : 'Ainda não fechado esse mês.'}
          </p>
        </div>
        <Button type="button" size="sm" variant={fechamentoAtual ? 'outline' : 'default'} disabled={fechando} onClick={fecharMes}>
          {fechando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
          {fechamentoAtual ? 'Re-fechar o mês' : 'Fechar o mês'}
        </Button>
      </Card>

      {financeiroInfo && config && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <HandCoins className="h-4 w-4" /> Pró-labore
            </h2>
            <Link href="/dashboard/financeiro" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
              Ver livro-caixa completo
            </Link>
          </div>

          {financeiroInfo.prolaboreCalculado < config.prolabore_piso && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              O pró-labore sugerido esse mês ({formatCurrency(financeiroInfo.prolaboreCalculado)}) está abaixo do piso configurado ({formatCurrency(config.prolabore_piso)}).
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                  <KpiIcon icon={HandCoins} tone="green" /> Pró-labore Sugerido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">{formatCurrency(financeiroInfo.prolaboreCalculado)}</div>
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setRetiradaDialogOpen(true)}>
                  Registrar essa retirada
                </Button>
              </CardContent>
            </Card>

            <Link href="/dashboard/financeiro" className="block">
              <Card size="sm" className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs font-normal">
                    <KpiIcon icon={Wallet} tone="blue" /> Retirado no Período
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatCurrency(financeiroInfo.retiradoNoPeriodo)}</CardContent>
              </Card>
            </Link>
          </div>

          {financeiroInfo.alocacaoSugerida.length > 0 && (
            <Card size="sm" className="gap-3">
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">Pra onde vai o resto do lucro</p>
                <div className="space-y-1.5">
                  {financeiroInfo.alocacaoSugerida.map(({ caixinha, valor }) => (
                    <div key={caixinha.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{caixinha.nome} ({caixinha.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)</span>
                      <span className="font-medium">{formatCurrency(valor)}</span>
                    </div>
                  ))}
                </div>
                <Button type="button" size="sm" variant="secondary" disabled={aplicandoAlocacao} onClick={aplicarAlocacaoCaixinhas}>
                  {aplicandoAlocacao ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Registrar essa divisão'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Boxes className="h-4 w-4" /> Últimos Lotes
        </h2>
        <Card className="py-1">
          {ultimosLotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm">Nenhum lote cadastrado ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ultimosLotes.map((l) => (
                <Link
                  key={l.id}
                  href={`/dashboard/lotes/${l.id}/custos`}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.codigo}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.fornecedor}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatData(l.data)}</span>
                  <span className="w-16 shrink-0 text-right font-medium">{l.quantidade} un.</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ClipboardList className="h-4 w-4" /> Relatório de Produtos
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produto ou fabricante..."
              value={relatorioBusca}
              onChange={(e) => setRelatorioBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
          <button type="button" onClick={() => ordenarPor('margem')} className="inline-flex items-center gap-1 hover:text-foreground">
            Margem % <ArrowUpDown className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => ordenarPor('vendasMes')} className="inline-flex items-center gap-1 hover:text-foreground">
            Vendas/Mês <ArrowUpDown className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => ordenarPor('lucroMes')} className="inline-flex items-center gap-1 hover:text-foreground">
            Lucro/Mês <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>

        <Card className="py-1">
          {relatorioProdutos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm">{produtos.length === 0 ? 'Nenhum produto ativo cadastrado ainda.' : 'Nenhum produto encontrado.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {relatorioProdutos.map(({ produto, margemPct, lucroMes, vendasQtd }) => {
                const corMargemProduto = corMargem(margemPct, config?.margem_minima_percentual ?? 0)
                return (
                  <Link
                    key={produto.id}
                    href={`/dashboard/produtos?busca=${encodeURIComponent(produto.nome)}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
                  >
                    <p className="min-w-0 flex-1 truncate font-medium">{produto.nome}</p>
                    <span className="w-20 shrink-0 text-right text-muted-foreground">{vendasQtd || '—'} vendas</span>
                    <span className={`w-20 shrink-0 text-right font-medium ${corMargemProduto}`}>{formatPctNullable(margemPct)}</span>
                    <span className={`w-28 shrink-0 text-right font-semibold ${corMargemProduto}`}>{formatCurrencyNullable(lucroMes)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <LancamentoDialog
        open={retiradaDialogOpen}
        onOpenChange={setRetiradaDialogOpen}
        caixinhas={caixinhas}
        categorias={categoriasFinanceiras}
        valorInicial={financeiroInfo?.prolaboreCalculado}
        retiradaInicial
        onSaved={carregar}
      />
    </div>
  )
}
