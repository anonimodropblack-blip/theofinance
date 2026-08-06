'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, MoreHorizontal, Loader2, Package, ArrowUp, ArrowDown, Wand2 } from 'lucide-react'
import { ProdutoDialog } from '@/components/produtos/produto-dialog'
import { KitDialog } from '@/components/produtos/kit-dialog'
import { FabricanteInput } from '@/components/produtos/fabricante-input'
import { CelulaEditavel, CelulaSelectEditavel } from '@/components/produtos/celula-editavel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { calcularProjecao } from '@/lib/produtos-projecao'
import { agruparVendasCanal, totalVendasProduto, type VendasPorProdutoCanal } from '@/lib/vendas-canal'
import { calcularCustoRealPorProduto, type LoteCustoComCategoria, type LoteItemComLote } from '@/lib/custo-real'
import { custoRealKit, estoqueDisponivelKit } from '@/lib/kits'
import { ajustarEstoque } from '@/lib/estoque'
import { agruparPrecosPorLocal, precoVendaEfetivo, salvarPrecoPorLocal, type PrecosPorProdutoCanal } from '@/lib/precos'
import { COR_ALERTA, COR_FATURAMENTO, COR_POSITIVO, corMargem, corSinal } from '@/lib/cores'
import { calcularDiasEstoque, calcularMediaDiaria, calcularSugestaoPedido } from '@/lib/reposicao'
import { toast } from 'sonner'
import type { Configuracao, Fabricante, FaixaLogisticaFba, FaixaTaxaMarketplacePreco, FechamentoMensalProduto, KitComponente, LocalEstoque, PrecoPorLocal, Produto, UnidadeEmbalagem, VendaMesCanal } from '@/types'

const UNIDADES_EMBALAGEM: readonly UnidadeEmbalagem[] = ['cápsulas', 'ml', 'gotas', 'porções', 'softgel']
const STATUS_OPCOES = ['ativo', 'inativo'] as const
const ADS_MODOS = ['percentual', 'valor'] as const

type ProdutoComEstoque = Produto & { estoqueTotal: number }

function formatCurrency(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(v: number | null) {
  if (v == null) return '—'
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function paraNumero(v: string): number | null {
  const limpo = v.trim().replace(',', '.')
  return limpo === '' ? null : Number(limpo)
}

function paraInteiro(v: string): number | null {
  const limpo = v.trim()
  return limpo === '' ? null : parseInt(limpo, 10)
}

// Célula de fabricante: reaproveita o autocomplete do dialog, mas no padrão clica-pra-editar
// das outras células da tabela.
function CelulaFabricante({ valor, fabricantes, onSalvar }: { valor: string; fabricantes: Fabricante[]; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor)
  const [salvando, setSalvando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!editando) setRascunho(valor) }, [valor, editando])

  async function confirmar() {
    setEditando(false)
    if (rascunho.trim() === (valor ?? '')) return
    setSalvando(true)
    await onSalvar(rascunho.trim())
    setSalvando(false)
  }

  if (editando) {
    return (
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) confirmar() }}
      >
        <FabricanteInput value={rascunho} onChange={setRascunho} fabricantes={fabricantes} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditando(true) }}
      className="w-full text-left rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/70 hover:ring-1 hover:ring-border transition-colors"
    >
      {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : (valor || '—')}
    </button>
  )
}

export default function ProdutosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([])
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [locaisEstoque, setLocaisEstoque] = useState<LocalEstoque[]>([])
  const [localSelecionadoId, setLocalSelecionadoId] = useState('')
  const [faixasFba, setFaixasFba] = useState<FaixaLogisticaFba[]>([])
  const [faixasPreco, setFaixasPreco] = useState<FaixaTaxaMarketplacePreco[]>([])
  const [loteItens, setLoteItens] = useState<LoteItemComLote[]>([])
  const [loteCustos, setLoteCustos] = useState<LoteCustoComCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const [busca, setBusca] = useState(() => searchParams.get('busca') ?? '')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [kitDialogOpen, setKitDialogOpen] = useState(false)
  const [editandoKit, setEditandoKit] = useState<Produto | null>(null)
  const [kitComponentes, setKitComponentes] = useState<KitComponente[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [pctPreco, setPctPreco] = useState('')
  const [aplicandoPreco, setAplicandoPreco] = useState(false)
  const [localEstoqueMassaId, setLocalEstoqueMassaId] = useState('')
  const [deltaEstoque, setDeltaEstoque] = useState('')
  const [aplicandoEstoque, setAplicandoEstoque] = useState(false)
  const [aplicandoStatus, setAplicandoStatus] = useState(false)
  const [adsModoMassa, setAdsModoMassa] = useState<'percentual' | 'valor'>('percentual')
  const [adsValorMassa, setAdsValorMassa] = useState('')
  const [aplicandoAds, setAplicandoAds] = useState(false)
  const [modoSelecao, setModoSelecao] = useState(false)
  const [aplicandoTodosPrecos, setAplicandoTodosPrecos] = useState(false)
  const [vendasCanal, setVendasCanal] = useState<VendasPorProdutoCanal>({})
  const [precosPorCanal, setPrecosPorCanal] = useState<PrecosPorProdutoCanal>({})
  const [fechamentosPorProduto, setFechamentosPorProduto] = useState<Record<string, FechamentoMensalProduto[]>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const arrastoRef = useRef<{ x: number; scrollLeft: number } | null>(null)

  function iniciarArrasto(e: React.MouseEvent) {
    if (!scrollRef.current) return
    arrastoRef.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft }
  }

  function moverArrasto(e: React.MouseEvent) {
    if (!arrastoRef.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = arrastoRef.current.scrollLeft - (e.clientX - arrastoRef.current.x)
  }

  function pararArrasto() {
    arrastoRef.current = null
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: fabs }, { data: cfg }, { data: locs }, { data: locsEstoque }, { data: fxsFba }, { data: fxsPreco }, { data: itens }, { data: custos }, { data: vendasCanalData }, { data: fechamentosProdutosData }, { data: kitsComp }, { data: precosData }] = await Promise.all([
      supabase.from('produtos').select('*, estoque(quantidade)').order('nome'),
      supabase.from('fabricantes').select('*').order('nome'),
      supabase.from('configuracoes').select('*').single(),
      supabase.from('locais_estoque').select('*').eq('tipo', 'marketplace').eq('ativo', true).order('ordem'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
      supabase.from('faixas_logistica_fba').select('*'),
      supabase.from('faixas_taxa_marketplace_preco').select('*'),
      supabase.from('lote_itens').select('*, lote:lotes(*)'),
      supabase.from('lote_custos').select('*, categoria:categorias_custo(*)'),
      supabase.from('vendas_mes_canal').select('*'),
      supabase.from('fechamentos_mensais_produtos').select('*'),
      supabase.from('kit_componentes').select('*'),
      supabase.from('precos_por_local').select('*'),
    ])

    const kitComponentesCarregados = (kitsComp ?? []) as KitComponente[]
    setKitComponentes(kitComponentesCarregados)

    if (!error && data) {
      const semKits = data.map((p) => {
        const { estoque, ...produto } = p as Produto & { estoque: { quantidade: number }[] }
        return {
          ...produto,
          estoqueTotal: estoque.reduce((soma, e) => soma + e.quantidade, 0),
        }
      })
      const estoqueTotalPorProduto = Object.fromEntries(semKits.map((p) => [p.id, p.estoqueTotal]))
      const componentesPorKit = new Map<string, KitComponente[]>()
      for (const c of kitComponentesCarregados) {
        componentesPorKit.set(c.kit_id, [...(componentesPorKit.get(c.kit_id) ?? []), c])
      }
      setProdutos(
        semKits.map((p) =>
          p.eh_kit
            ? { ...p, estoqueTotal: estoqueDisponivelKit(componentesPorKit.get(p.id) ?? [], estoqueTotalPorProduto) }
            : p
        )
      )
    }
    setFabricantes((fabs ?? []) as Fabricante[])
    setConfig(cfg as Configuracao)
    const locaisCarregados = (locs ?? []) as LocalEstoque[]
    setLocais(locaisCarregados)
    setLocalSelecionadoId((atual) => atual || locaisCarregados[0]?.id || '')
    const locaisEstoqueCarregados = (locsEstoque ?? []) as LocalEstoque[]
    setLocaisEstoque(locaisEstoqueCarregados)
    setLocalEstoqueMassaId((atual) => atual || locaisEstoqueCarregados[0]?.id || '')
    setFaixasFba(
      ((fxsFba ?? []) as FaixaLogisticaFba[]).sort((a, b) => {
        if (a.peso_min !== b.peso_min) return a.peso_min - b.peso_min
        return a.preco_min - b.preco_min
      })
    )
    setFaixasPreco((fxsPreco ?? []) as FaixaTaxaMarketplacePreco[])
    setLoteItens((itens ?? []) as LoteItemComLote[])
    setLoteCustos((custos ?? []) as LoteCustoComCategoria[])
    setVendasCanal(agruparVendasCanal((vendasCanalData ?? []) as VendaMesCanal[]))
    setPrecosPorCanal(agruparPrecosPorLocal((precosData ?? []) as PrecoPorLocal[]))
    const fechamentosAgrupados: Record<string, FechamentoMensalProduto[]> = {}
    for (const f of (fechamentosProdutosData ?? []) as FechamentoMensalProduto[]) {
      if (!fechamentosAgrupados[f.produto_id]) fechamentosAgrupados[f.produto_id] = []
      fechamentosAgrupados[f.produto_id].push(f)
    }
    setFechamentosPorProduto(fechamentosAgrupados)
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = produtos.filter((p) => {
    const q = busca.toLowerCase()
    return !q || p.nome.toLowerCase().includes(q) || (p.fabricante ?? '').toLowerCase().includes(q)
  })

  const impostoPercentual = config?.imposto_percentual ?? 0
  const margemMinimaPercentual = config?.margem_minima_percentual ?? 0
  const localSelecionado = locais.find((l) => l.id === localSelecionadoId) ?? null
  const totalVendasMes = produtos.reduce((s, p) => s + (p.status === 'ativo' ? totalVendasProduto(vendasCanal, p.id) : 0), 0)
  const adsDiluidoPorUnidade = totalVendasMes > 0 ? (config?.gasto_ads_mensal ?? 0) / totalVendasMes : 0
  const custoRealBase = useMemo(() => calcularCustoRealPorProduto(loteItens, loteCustos), [loteItens, loteCustos])
  // Custo unitário "disponível" por produto (real se tem lote, senão o estimado do
  // cadastro) — usado pra somar o custo dos componentes de cada kit.
  const custoUnitarioPorProdutoBase = useMemo(() => {
    const resultado: Record<string, number | null> = {}
    for (const p of produtos) {
      if (p.eh_kit) continue
      const real = custoRealBase[p.id]
      resultado[p.id] = real ? real.custoUnitario + real.custosLogistica.reduce((s, c) => s + c.valor, 0) : p.preco_custo_unitario
    }
    return resultado
  }, [custoRealBase, produtos])
  const custoRealPorProduto = useMemo(() => {
    const componentesPorKit = new Map<string, KitComponente[]>()
    for (const c of kitComponentes) componentesPorKit.set(c.kit_id, [...(componentesPorKit.get(c.kit_id) ?? []), c])
    const resultado = { ...custoRealBase }
    for (const p of produtos) {
      if (!p.eh_kit) continue
      const custoKit = custoRealKit(componentesPorKit.get(p.id) ?? [], custoUnitarioPorProdutoBase)
      if (custoKit) resultado[p.id] = custoKit
    }
    return resultado
  }, [custoRealBase, kitComponentes, produtos, custoUnitarioPorProdutoBase])
  const estoqueTotalPorProdutoBase = useMemo(
    () => Object.fromEntries(produtos.filter((p) => !p.eh_kit).map((p) => [p.id, p.estoqueTotal])),
    [produtos]
  )
  const labelColunaExtra = localSelecionado?.usa_tarifa_fba ? 'Logística FBA' : localSelecionado?.usa_taxa_por_faixa ? 'Taxa Fixa' : '—'

  // Preço efetivo de um produto no canal selecionado: usa a exceção cadastrada pra esse
  // canal (precosPorCanal) se existir, senão cai no preço padrão do produto — é isso que
  // faz o preço poder ser diferente por plataforma em vez de sempre o mesmo campo global.
  const precoEfetivoDe = useCallback(
    (p: Produto) => precoVendaEfetivo(p.id, p.preco_venda, localSelecionadoId, precosPorCanal),
    [localSelecionadoId, precosPorCanal]
  )

  const totais = useMemo(() => {
    let lucroMes = 0
    let lucroTotal = 0
    let brutoTotal = 0
    for (const p of produtos) {
      if (p.status !== 'ativo') continue
      const precoEfetivo = precoEfetivoDe(p)
      const produtoEfetivo = precoEfetivo !== p.preco_venda ? { ...p, preco_venda: precoEfetivo } : p
      const vendidoNesteCanal = vendasCanal[p.id]?.[localSelecionadoId] ?? 0
      const projecao = calcularProjecao(produtoEfetivo, custoRealPorProduto[p.id] ?? null, localSelecionado, vendidoNesteCanal, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
      if (projecao.lucroMes != null) lucroMes += projecao.lucroMes
      if (projecao.lucroPorUnidade != null) lucroTotal += projecao.lucroPorUnidade * p.estoqueTotal
      if (precoEfetivo != null) brutoTotal += precoEfetivo * p.estoqueTotal
    }
    return { lucroMes, lucroTotal, brutoTotal }
  }, [produtos, custoRealPorProduto, localSelecionado, localSelecionadoId, vendasCanal, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade, precoEfetivoDe])

  // Produtos cujo preço sugerido (pra bater a margem mínima configurada) difere do preço
  // atual em pelo menos 1 centavo — tanto pra cima (margem baixa) quanto pra baixo (margem
  // sobrando, dá pra baixar o preço). Base do botão "Aplicar todos".
  const sugestoesPendentes = useMemo(() => {
    return filtrados.flatMap((p) => {
      const precoEfetivo = precoEfetivoDe(p)
      if (precoEfetivo == null) return []
      const produtoEfetivo = precoEfetivo !== p.preco_venda ? { ...p, preco_venda: precoEfetivo } : p
      const custoReal = custoRealPorProduto[p.id] ?? null
      const vendidoNesteCanal = vendasCanal[p.id]?.[localSelecionadoId] ?? 0
      const { precoSugerido } = calcularProjecao(produtoEfetivo, custoReal, localSelecionado, vendidoNesteCanal, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
      if (precoSugerido == null || Math.abs(precoSugerido - precoEfetivo) < 0.01) return []
      return [{ produto: p, precoSugerido }]
    })
  }, [filtrados, custoRealPorProduto, localSelecionado, localSelecionadoId, vendasCanal, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade, precoEfetivoDe])

  function abrirNovo() {
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(p: Produto) {
    setEditando(p)
    setDialogOpen(true)
  }

  function abrirNovoKit() {
    setEditandoKit(null)
    setKitDialogOpen(true)
  }

  function abrirEdicaoKit(p: Produto) {
    setEditandoKit(p)
    setKitDialogOpen(true)
  }

  async function salvarCampo(id: string, campo: string, valor: unknown) {
    const { error } = await supabase.from('produtos').update({ [campo]: valor }).eq('id', id)
    if (error) {
      toast.error('Erro ao salvar.')
      return
    }
    await carregar()
  }

  async function aplicarPrecoSugerido(p: Produto, precoSugerido: number) {
    if (!localSelecionadoId) return
    try {
      await salvarPrecoPorLocal(supabase, p.id, localSelecionadoId, precoSugerido)
    } catch {
      toast.error('Erro ao aplicar preço sugerido.')
      return
    }
    toast.success(`Preço de ${p.nome} em ${localSelecionado?.nome ?? 'canal'} atualizado para ${formatCurrency(precoSugerido)}`)
    carregar()
  }

  async function aplicarTodosPrecosSugeridos() {
    if (sugestoesPendentes.length === 0 || !localSelecionadoId) return
    setAplicandoTodosPrecos(true)
    const resultados = await Promise.allSettled(
      sugestoesPendentes.map(({ produto, precoSugerido }) => salvarPrecoPorLocal(supabase, produto.id, localSelecionadoId, precoSugerido))
    )
    setAplicandoTodosPrecos(false)
    const falhas = resultados.filter((r) => r.status === 'rejected').length
    if (falhas > 0) toast.error(`${falhas} produto(s) não puderam ser atualizados.`)
    const sucesso = sugestoesPendentes.length - falhas
    if (sucesso > 0) toast.success(`Preço sugerido aplicado em ${sucesso} produto(s) (${localSelecionado?.nome ?? 'canal'})`)
    carregar()
  }

  async function excluirProduto(p: Produto) {
    if (!window.confirm(`Excluir "${p.nome}"? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('produtos').delete().eq('id', p.id)
    if (error) {
      toast.error(`Não foi possível excluir "${p.nome}" — provavelmente já tem lote ou movimentação vinculada. Marque como Inativo em vez de excluir.`)
      return
    }
    toast.success(`"${p.nome}" excluído`)
    carregar()
  }

  function alternarSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function alternarSelecaoTodos() {
    setSelecionados((prev) => {
      const todosSelecionados = filtrados.length > 0 && filtrados.every((p) => prev.has(p.id))
      if (todosSelecionados) return new Set()
      return new Set(filtrados.map((p) => p.id))
    })
  }

  function selecionarTodos() {
    setSelecionados(new Set(filtrados.map((p) => p.id)))
  }

  function desmarcarTodos() {
    setSelecionados(new Set())
  }

  async function aplicarPrecoEmMassa() {
    const pct = paraNumero(pctPreco)
    if (pct == null || pct === 0) {
      toast.error('Informe o percentual de variação.')
      return
    }
    if (!localSelecionadoId) return
    const alvo = produtos
      .filter((p) => selecionados.has(p.id))
      .flatMap((p) => {
        const precoEfetivo = precoEfetivoDe(p)
        return precoEfetivo != null ? [{ produto: p, precoEfetivo }] : []
      })
    if (alvo.length === 0) {
      toast.error('Nenhum produto selecionado tem preço de venda cadastrado.')
      return
    }
    setAplicandoPreco(true)
    await Promise.all(
      alvo.map(({ produto, precoEfetivo }) => {
        const novoPreco = Math.round(precoEfetivo * (1 + pct / 100) * 100) / 100
        return salvarPrecoPorLocal(supabase, produto.id, localSelecionadoId, novoPreco)
      })
    )
    setAplicandoPreco(false)
    setPctPreco('')
    toast.success(`Preço ajustado em ${alvo.length} produto(s) (${localSelecionado?.nome ?? 'canal'})`)
    carregar()
  }

  async function aplicarEstoqueEmMassa() {
    const delta = paraInteiro(deltaEstoque)
    if (!localEstoqueMassaId) {
      toast.error('Selecione o local.')
      return
    }
    if (delta == null || delta === 0) {
      toast.error('Informe a quantidade (use negativo pra remover).')
      return
    }
    const ids = [...selecionados]
    if (ids.length === 0) return
    setAplicandoEstoque(true)
    try {
      await Promise.all(
        ids.map(async (id) => {
          await supabase.from('movimentacoes').insert({
            produto_id: id,
            tipo: 'ajuste',
            quantidade: delta,
            origem_local_id: localEstoqueMassaId,
            observacao: 'Ajuste em massa',
          })
          await ajustarEstoque(supabase, id, localEstoqueMassaId, delta)
        })
      )
    } catch {
      toast.error('Não deu pra atualizar o estoque de todos os produtos. Confira manualmente.')
      setAplicandoEstoque(false)
      return
    }
    setAplicandoEstoque(false)
    setDeltaEstoque('')
    toast.success(`Estoque ajustado em ${ids.length} produto(s)`)
    carregar()
  }

  async function aplicarStatusEmMassa(novoStatus: 'ativo' | 'inativo') {
    const ids = [...selecionados]
    if (ids.length === 0) return
    setAplicandoStatus(true)
    const { error } = await supabase.from('produtos').update({ status: novoStatus }).in('id', ids)
    setAplicandoStatus(false)
    if (error) {
      toast.error('Erro ao atualizar status.')
      return
    }
    toast.success(`Status atualizado em ${ids.length} produto(s)`)
    carregar()
  }

  async function aplicarAdsEmMassa() {
    const valor = paraNumero(adsValorMassa)
    if (valor == null) {
      toast.error('Informe o valor do Ads.')
      return
    }
    const ids = [...selecionados]
    if (ids.length === 0) return
    setAplicandoAds(true)
    const { error } = await supabase.from('produtos').update({ ads_modo: adsModoMassa, ads_valor: valor }).in('id', ids)
    setAplicandoAds(false)
    if (error) {
      toast.error('Erro ao atualizar Ads.')
      return
    }
    toast.success(`Ads atualizado em ${ids.length} produto(s)`)
    setAdsValorMassa('')
    carregar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={abrirNovoKit}>
            <Plus className="h-4 w-4" />
            Novo Kit
          </Button>
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Lucro/Mês ({localSelecionado?.nome ?? '—'})</CardTitle>
          </CardHeader>
          <CardContent className={`text-lg font-semibold ${corSinal(totais.lucroMes)}`}>{formatCurrency(totais.lucroMes)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Bruto Total (todos ativos)</CardTitle>
          </CardHeader>
          <CardContent className={`text-lg font-semibold ${COR_FATURAMENTO}`}>{formatCurrency(totais.brutoTotal)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Líquido Total (todos ativos)</CardTitle>
          </CardHeader>
          <CardContent className={`text-lg font-semibold ${corSinal(totais.lucroTotal)}`}>{formatCurrency(totais.lucroTotal)}</CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative max-w-sm flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produto ou fabricante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={localSelecionadoId}
            onValueChange={(v) => setLocalSelecionadoId(v ?? '')}
            items={Object.fromEntries(locais.map((l) => [l.id, l.nome]))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Marketplace..." />
            </SelectTrigger>
            <SelectContent>
              {locais.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={modoSelecao ? 'default' : 'outline'}
            onClick={() => setModoSelecao((m) => !m)}
          >
            {modoSelecao ? 'Sair da seleção' : 'Selecionar'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={selecionarTodos}>
            Selecionar todos
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={desmarcarTodos} disabled={selecionados.size === 0}>
            Tirar seleção
          </Button>
          <p className="text-xs text-muted-foreground">
            {modoSelecao
              ? 'Clique em qualquer linha pra selecionar/desselecionar.'
              : 'Clique em qualquer valor da tabela pra editar direto — salva sozinho e recalcula na hora. Exceção: Vendas/Mês agora é por canal, edite no formulário completo. Revenda: edita o preço só do canal selecionado acima ("•" = já tem preço específico desse canal).'}
          </p>
        </div>
      </div>

      {sugestoesPendentes.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm">
            <strong>{sugestoesPendentes.length}</strong> produto(s) com preço fora da margem mínima configurada (pra mais ou pra menos).
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="ml-auto"
            disabled={aplicandoTodosPrecos}
            onClick={aplicarTodosPrecosSugeridos}
          >
            {aplicandoTodosPrecos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Aplicar todos os preços sugeridos
          </Button>
        </div>
      )}

      {selecionados.size > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium whitespace-nowrap">{selecionados.size} selecionado(s)</span>

          <div className="flex items-center gap-1.5">
            <Input
              inputMode="decimal"
              placeholder="% preço"
              className="h-8 w-24"
              value={pctPreco}
              onChange={(e) => setPctPreco(e.target.value)}
            />
            <Button type="button" size="sm" variant="secondary" onClick={aplicarPrecoEmMassa} disabled={aplicandoPreco}>
              {aplicandoPreco ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar % no preço'}
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Select
              value={localEstoqueMassaId}
              onValueChange={(v) => setLocalEstoqueMassaId(v ?? '')}
              items={Object.fromEntries(locaisEstoque.map((l) => [l.id, l.nome]))}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Local..." />
              </SelectTrigger>
              <SelectContent>
                {locaisEstoque.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Qtd. (+/-)"
              className="h-8 w-28"
              value={deltaEstoque}
              onChange={(e) => setDeltaEstoque(e.target.value)}
            />
            <Button type="button" size="sm" variant="secondary" onClick={aplicarEstoqueEmMassa} disabled={aplicandoEstoque}>
              {aplicandoEstoque ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ajustar estoque'}
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Select
              value={adsModoMassa}
              onValueChange={(v) => setAdsModoMassa((v ?? 'percentual') as 'percentual' | 'valor')}
              items={{ percentual: '%', valor: 'R$' }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">%</SelectItem>
                <SelectItem value="valor">R$</SelectItem>
              </SelectContent>
            </Select>
            <Input
              inputMode="decimal"
              placeholder="Ads"
              className="h-8 w-20"
              value={adsValorMassa}
              onChange={(e) => setAdsValorMassa(e.target.value)}
            />
            <Button type="button" size="sm" variant="secondary" onClick={aplicarAdsEmMassa} disabled={aplicandoAds}>
              {aplicandoAds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar Ads'}
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled={aplicandoStatus} onClick={() => aplicarStatusEmMassa('ativo')}>
              Marcar ativo
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={aplicandoStatus} onClick={() => aplicarStatusEmMassa('inativo')}>
              Marcar inativo
            </Button>
          </div>

          <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => setSelecionados(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="rounded-lg border border-border overflow-auto max-h-[70vh] cursor-grab active:cursor-grabbing"
        onMouseDown={iniciarArrasto}
        onMouseMove={moverArrasto}
        onMouseUp={pararArrasto}
        onMouseLeave={pararArrasto}
      >
        {loading && produtos.length === 0 ? (
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
            <TableHeader className="sticky top-0 z-20 bg-background">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id))}
                    onCheckedChange={alternarSelecaoTodos}
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="whitespace-nowrap">Fabricante</TableHead>
                <TableHead className="whitespace-nowrap sticky left-0 z-30 bg-background">Produto</TableHead>
                <TableHead className="whitespace-nowrap">Composição / Dosagem</TableHead>
                <TableHead className="text-right whitespace-nowrap">Qtd. Embalagem</TableHead>
                <TableHead className="whitespace-nowrap">Unidade</TableHead>
                <TableHead className="text-right whitespace-nowrap">Peso (g)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Preço/Und.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Custo Real (Médio)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Estoque</TableHead>
                <TableHead className="text-right whitespace-nowrap">Média/Dia</TableHead>
                <TableHead className="text-right whitespace-nowrap">Dias de Estoque</TableHead>
                <TableHead className="text-right whitespace-nowrap">Sugestão Próximo Pedido</TableHead>
                <TableHead className="text-right whitespace-nowrap">Revenda</TableHead>
                <TableHead className="text-right whitespace-nowrap">Comissão</TableHead>
                <TableHead className="text-right whitespace-nowrap">Imposto</TableHead>
                <TableHead className="text-right whitespace-nowrap">{labelColunaExtra}</TableHead>
                <TableHead className="whitespace-nowrap">Ads: Modo</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ads: Valor</TableHead>
                <TableHead className="text-right whitespace-nowrap">Custo Ads</TableHead>
                <TableHead className="text-right whitespace-nowrap">Margem %</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro Líquido/Unid.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Vendas/Mês</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro/Mês</TableHead>
                <TableHead className="text-right whitespace-nowrap">Lucro Total</TableHead>
                <TableHead className="whitespace-nowrap">Sugestão de Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p, index) => {
                const custoReal = custoRealPorProduto[p.id] ?? null
                const vendidoNesteCanal = vendasCanal[p.id]?.[localSelecionadoId] ?? 0
                const precoEfetivo = precoEfetivoDe(p)
                const temExcecaoCanal = precoEfetivo !== p.preco_venda
                const produtoEfetivo = temExcecaoCanal ? { ...p, preco_venda: precoEfetivo } : p
                const { usandoCustoReal, valorComissao, taxaPct, valorImposto, valorExtra, valorAds, usandoAdsDiluido, pesoFaltando, semFaixaPreco, lucroPorUnidade, margemPct, lucroMes, precoSugerido } = calcularProjecao(produtoEfetivo, custoReal, localSelecionado, vendidoNesteCanal, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual, adsDiluidoPorUnidade)
                const lucroTotal = lucroPorUnidade != null ? lucroPorUnidade * p.estoqueTotal : null
                const corLinha = corMargem(margemPct, margemMinimaPercentual)
                const mediaDiaria = calcularMediaDiaria(fechamentosPorProduto[p.id] ?? [])
                const diasEstoque = calcularDiasEstoque(p.estoqueTotal, mediaDiaria)
                const sugestaoPedido = calcularSugestaoPedido(p.estoqueTotal, mediaDiaria, config?.prazo_reposicao_dias ?? 0, config?.estoque_cobertura_dias ?? 0, config?.crescimento_estoque_pct ?? 0)
                const precisaAjuste = precoSugerido != null && precoEfetivo != null && Math.abs(precoSugerido - precoEfetivo) >= 0.01
                const aumentando = precisaAjuste && precoSugerido! > precoEfetivo!
                const variacaoPct = precisaAjuste && precoEfetivo ? ((precoSugerido! - precoEfetivo) / precoEfetivo) * 100 : null
                return (
                <TableRow
                  key={p.id}
                  className={`hover:bg-muted/50 ${modoSelecao ? 'cursor-pointer' : ''}`}
                  data-selected={selecionados.has(p.id)}
                  onClick={() => { if (modoSelecao) alternarSelecao(p.id) }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => alternarSelecao(p.id)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <CelulaFabricante valor={p.fabricante ?? ''} fabricantes={fabricantes} onSalvar={(v) => salvarCampo(p.id, 'fabricante', v || null)} />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap sticky left-0 z-10 bg-background">
                    <div className="flex items-center gap-1.5">
                      {p.eh_kit && <Badge variant="secondary" className="shrink-0">Kit</Badge>}
                      <CelulaEditavel valor={p.nome} onSalvar={async (v) => { if (v.trim()) await salvarCampo(p.id, 'nome', v.trim()) }} />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <CelulaEditavel valor={p.composicao ?? ''} onSalvar={(v) => salvarCampo(p.id, 'composicao', v.trim() || null)} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel valor={p.quantidade_embalagem != null ? String(p.quantidade_embalagem) : ''} align="right" tipo="numeric" onSalvar={(v) => salvarCampo(p.id, 'quantidade_embalagem', paraInteiro(v))} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <CelulaSelectEditavel valor={p.unidade_embalagem ?? ''} opcoes={UNIDADES_EMBALAGEM} onSalvar={(v) => salvarCampo(p.id, 'unidade_embalagem', v || null)} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel valor={p.peso_gramas != null ? String(p.peso_gramas) : ''} align="right" tipo="numeric" onSalvar={(v) => salvarCampo(p.id, 'peso_gramas', paraInteiro(v))} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel
                      valor={p.preco_custo_unitario != null ? String(p.preco_custo_unitario) : ''}
                      exibir={formatCurrency(p.preco_custo_unitario)}
                      align="right"
                      tipo="decimal"
                      onSalvar={(v) => salvarCampo(p.id, 'preco_custo_unitario', paraNumero(v))}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {custoReal ? (
                      <span
                        title={custoReal.custosLogistica.length > 0 ? `Custo médio: ${formatCurrency(custoReal.custoUnitario)}\n${custoReal.custosLogistica.map((c) => `${c.nome}: ${formatCurrency(c.valor)}`).join('\n')}` : `Custo médio: ${formatCurrency(custoReal.custoUnitario)}`}
                      >
                        {formatCurrency(custoReal.custoUnitario + custoReal.custosLogistica.reduce((s, c) => s + c.valor, 0))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">sem lote</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{p.estoqueTotal}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {mediaDiaria != null ? mediaDiaria.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${diasEstoque != null && config && diasEstoque < config.prazo_reposicao_dias ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {diasEstoque != null ? Math.round(diasEstoque) : '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium">
                    {sugestaoPedido != null && sugestaoPedido > 0 ? sugestaoPedido : sugestaoPedido === 0 ? '—' : <span className="text-muted-foreground font-normal" title="Sem histórico de mês fechado pra esse produto ainda">sem dados</span>}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${COR_FATURAMENTO}`}>
                    <span title={temExcecaoCanal ? `Preço específico de ${localSelecionado?.nome} — o padrão do produto é ${formatCurrency(p.preco_venda)}` : 'Preço padrão do produto (mesmo em todo canal sem exceção)'}>
                      <CelulaEditavel
                        valor={precoEfetivo != null ? String(precoEfetivo) : ''}
                        exibir={`${formatCurrency(precoEfetivo)}${temExcecaoCanal ? ' •' : ''}`}
                        align="right"
                        tipo="decimal"
                        onSalvar={async (v) => {
                          const num = paraNumero(v)
                          if (num == null || !localSelecionadoId) return
                          await salvarPrecoPorLocal(supabase, p.id, localSelecionadoId, num)
                          await carregar()
                        }}
                      />
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {formatCurrency(valorComissao)} <span className="text-xs">({formatPct(taxaPct)})</span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {formatCurrency(valorImposto)} <span className="text-xs">({formatPct(p.preco_venda != null ? impostoPercentual : null)})</span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {pesoFaltando ? (
                      <span className="text-amber-600 dark:text-amber-500">sem peso</span>
                    ) : semFaixaPreco ? (
                      <span className="text-amber-600 dark:text-amber-500">sem faixa</span>
                    ) : (
                      formatCurrency(valorExtra)
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <CelulaSelectEditavel
                      valor={p.ads_modo ?? ''}
                      opcoes={ADS_MODOS}
                      exibir={p.ads_modo ? (p.ads_modo === 'percentual' ? '%' : 'R$') : '—'}
                      onSalvar={(v) => salvarCampo(p.id, 'ads_modo', v || null)}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel
                      valor={p.ads_valor != null ? String(p.ads_valor) : ''}
                      exibir={p.ads_valor != null ? (p.ads_modo === 'percentual' ? formatPct(p.ads_valor) : formatCurrency(p.ads_valor)) : '—'}
                      align="right"
                      tipo="decimal"
                      onSalvar={(v) => salvarCampo(p.id, 'ads_valor', paraNumero(v))}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {formatCurrency(valorAds)}
                    {usandoAdsDiluido && (
                      <span className="text-[10px] font-normal ml-1" title="Sem Ads manual cadastrado — usando o gasto mensal total diluído pelas vendas/mês de todos os produtos.">dil.</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap font-medium ${corLinha}`}>
                    {formatPct(margemPct)}
                    {margemPct != null && !usandoCustoReal && (
                      <span className="text-[10px] text-muted-foreground font-normal ml-1" title="Sem lote cadastrado ainda — usando o custo estimado do cadastro, não o custo real de compra.">est.</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${corLinha}`}>{formatCurrency(lucroPorUnidade)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground" title="Edite por canal no formulário completo (menu de 3 pontos > Editar)">
                    {totalVendasProduto(vendasCanal, p.id)}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${corLinha}`}>{formatCurrency(lucroMes)}</TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${corLinha}`}>{formatCurrency(lucroTotal)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {precisaAjuste ? (
                      <div className="flex items-center gap-2">
                        {aumentando ? (
                          <ArrowUp className={`h-3.5 w-3.5 ${COR_ALERTA}`} />
                        ) : (
                          <ArrowDown className={`h-3.5 w-3.5 ${COR_POSITIVO}`} />
                        )}
                        <div className="flex flex-col leading-tight">
                          <span className={`font-medium ${COR_FATURAMENTO}`}>{formatCurrency(precoSugerido)}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {variacaoPct != null && `${variacaoPct > 0 ? '+' : ''}${formatPct(variacaoPct)}`}
                            {margemPct != null && ` · margem ${formatPct(margemPct)}→${formatPct(margemMinimaPercentual)}`}
                          </span>
                        </div>
                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => aplicarPrecoSugerido(p, precoSugerido!)}>
                          Aplicar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CelulaSelectEditavel
                      valor={p.status}
                      opcoes={STATUS_OPCOES}
                      exibir={<Badge variant={p.status === 'ativo' ? 'default' : 'secondary'}>{p.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge>}
                      onSalvar={(v) => salvarCampo(p.id, 'status', v)}
                    />
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
                        <DropdownMenuItem onClick={() => (p.eh_kit ? abrirEdicaoKit(p) : abrirEdicao(p))}>
                          {p.eh_kit ? 'Editar kit' : 'Editar (formulário completo)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => excluirProduto(p)} className="text-destructive">Excluir</DropdownMenuItem>
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
        locaisMarketplace={locais}
        vendasCanalProduto={editando ? vendasCanal[editando.id] ?? {} : {}}
        onSaved={carregar}
      />

      <KitDialog
        open={kitDialogOpen}
        onOpenChange={setKitDialogOpen}
        kit={editandoKit}
        componentesAtuais={editandoKit ? kitComponentes.filter((c) => c.kit_id === editandoKit.id) : []}
        produtosDisponiveis={produtos}
        custoUnitarioPorProduto={custoUnitarioPorProdutoBase}
        estoqueTotalPorProduto={estoqueTotalPorProdutoBase}
        onSaved={carregar}
      />
    </div>
  )
}
