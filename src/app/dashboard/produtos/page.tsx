'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Plus, Search, MoreHorizontal, Loader2, Package } from 'lucide-react'
import { ProdutoDialog } from '@/components/produtos/produto-dialog'
import { FabricanteInput } from '@/components/produtos/fabricante-input'
import { CelulaEditavel, CelulaSelectEditavel } from '@/components/produtos/celula-editavel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { calcularProjecao } from '@/lib/produtos-projecao'
import { calcularCustoRealPorProduto, type LoteCustoComCategoria, type LoteItemComLote } from '@/lib/custo-real'
import { ajustarEstoque } from '@/lib/estoque'
import { COR_FATURAMENTO, corMargem, corSinal } from '@/lib/cores'
import { toast } from 'sonner'
import type { Configuracao, Fabricante, FaixaLogisticaFba, FaixaTaxaMarketplacePreco, LocalEstoque, Produto, TipoProduto, UnidadeEmbalagem } from '@/types'

const TIPOS_PRODUTO: readonly TipoProduto[] = ['Cápsula', 'Pó', 'Mastigável', 'Líquido', 'Chá', 'Softgel']
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
  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [pctPreco, setPctPreco] = useState('')
  const [aplicandoPreco, setAplicandoPreco] = useState(false)
  const [localEstoqueMassaId, setLocalEstoqueMassaId] = useState('')
  const [deltaEstoque, setDeltaEstoque] = useState('')
  const [aplicandoEstoque, setAplicandoEstoque] = useState(false)
  const [aplicandoStatus, setAplicandoStatus] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: fabs }, { data: cfg }, { data: locs }, { data: locsEstoque }, { data: fxsFba }, { data: fxsPreco }, { data: itens }, { data: custos }] = await Promise.all([
      supabase.from('produtos').select('*, estoque(quantidade)').order('nome'),
      supabase.from('fabricantes').select('*').order('nome'),
      supabase.from('configuracoes').select('*').single(),
      supabase.from('locais_estoque').select('*').eq('tipo', 'marketplace').eq('ativo', true).order('ordem'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
      supabase.from('faixas_logistica_fba').select('*'),
      supabase.from('faixas_taxa_marketplace_preco').select('*'),
      supabase.from('lote_itens').select('*, lote:lotes(*)'),
      supabase.from('lote_custos').select('*, categoria:categorias_custo(*)'),
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
  const custoRealPorProduto = useMemo(() => calcularCustoRealPorProduto(loteItens, loteCustos), [loteItens, loteCustos])
  const labelColunaExtra = localSelecionado?.usa_tarifa_fba ? 'Logística FBA' : localSelecionado?.usa_taxa_por_faixa ? 'Taxa Fixa' : '—'

  const totais = useMemo(() => {
    let lucroMes = 0
    let lucroTotal = 0
    for (const p of produtos) {
      if (p.status !== 'ativo') continue
      const projecao = calcularProjecao(p, custoRealPorProduto[p.id] ?? null, localSelecionado, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual)
      if (projecao.lucroMes != null) lucroMes += projecao.lucroMes
      if (projecao.lucroPorUnidade != null) lucroTotal += projecao.lucroPorUnidade * p.estoqueTotal
    }
    return { lucroMes, lucroTotal }
  }, [produtos, custoRealPorProduto, localSelecionado, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual])

  function abrirNovo() {
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(p: Produto) {
    setEditando(p)
    setDialogOpen(true)
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
    const { error } = await supabase.from('produtos').update({ preco_venda: precoSugerido }).eq('id', p.id)
    if (error) {
      toast.error('Erro ao aplicar preço sugerido.')
      return
    }
    toast.success(`Preço de ${p.nome} atualizado para ${formatCurrency(precoSugerido)}`)
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

  async function aplicarPrecoEmMassa() {
    const pct = paraNumero(pctPreco)
    if (pct == null || pct === 0) {
      toast.error('Informe o percentual de variação.')
      return
    }
    const alvo = produtos.filter((p) => selecionados.has(p.id) && p.preco_venda != null)
    if (alvo.length === 0) {
      toast.error('Nenhum produto selecionado tem preço de venda cadastrado.')
      return
    }
    setAplicandoPreco(true)
    await Promise.all(
      alvo.map((p) => {
        const novoPreco = Math.round(p.preco_venda! * (1 + pct / 100) * 100) / 100
        return supabase.from('produtos').update({ preco_venda: novoPreco }).eq('id', p.id)
      })
    )
    setAplicandoPreco(false)
    setPctPreco('')
    toast.success(`Preço ajustado em ${alvo.length} produto(s)`)
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
          <CardContent className={`text-lg font-semibold ${corSinal(totais.lucroMes)}`}>{formatCurrency(totais.lucroMes)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Lucro Total (todos ativos)</CardTitle>
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
        <p className="text-xs text-muted-foreground">Clique em qualquer valor da tabela pra editar direto — salva sozinho e recalcula na hora.</p>
      </div>

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

      <div className="rounded-lg border border-border overflow-auto max-h-[70vh]">
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
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="text-right whitespace-nowrap">Peso (g)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Qtd. Mín.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Preço/Und.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Custo Real (Lote)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Preço Total</TableHead>
                <TableHead className="text-right whitespace-nowrap">Estoque</TableHead>
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
                const { precoTotal, usandoCustoReal, valorComissao, taxaPct, valorImposto, valorExtra, valorAds, pesoFaltando, semFaixaPreco, lucroPorUnidade, margemPct, lucroMes, precoSugerido } = calcularProjecao(p, custoReal, localSelecionado, faixasFba, faixasPreco, impostoPercentual, margemMinimaPercentual)
                const lucroTotal = lucroPorUnidade != null ? lucroPorUnidade * p.estoqueTotal : null
                const margemBaixa = margemPct != null && config != null && margemPct < config.margem_minima_percentual
                const corLinha = corMargem(margemPct, margemMinimaPercentual)
                return (
                <TableRow key={p.id} className="hover:bg-muted/50" data-selected={selecionados.has(p.id)}>
                  <TableCell>
                    <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => alternarSelecao(p.id)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <CelulaFabricante valor={p.fabricante ?? ''} fabricantes={fabricantes} onSalvar={(v) => salvarCampo(p.id, 'fabricante', v || null)} />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap sticky left-0 z-10 bg-background">
                    <CelulaEditavel valor={p.nome} onSalvar={async (v) => { if (v.trim()) await salvarCampo(p.id, 'nome', v.trim()) }} />
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
                  <TableCell className="whitespace-nowrap">
                    <CelulaSelectEditavel valor={p.tipo ?? ''} opcoes={TIPOS_PRODUTO} onSalvar={(v) => salvarCampo(p.id, 'tipo', v || null)} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel valor={p.peso_gramas != null ? String(p.peso_gramas) : ''} align="right" tipo="numeric" onSalvar={(v) => salvarCampo(p.id, 'peso_gramas', paraInteiro(v))} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel valor={p.qtd_minima != null ? String(p.qtd_minima) : ''} align="right" tipo="numeric" onSalvar={(v) => salvarCampo(p.id, 'qtd_minima', paraInteiro(v))} />
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
                        title={custoReal.custosLogistica.length > 0 ? `Compra: ${formatCurrency(custoReal.custoUnitario)}\n${custoReal.custosLogistica.map((c) => `${c.nome}: ${formatCurrency(c.valor)}`).join('\n')}` : `Compra: ${formatCurrency(custoReal.custoUnitario)}`}
                      >
                        {formatCurrency(custoReal.custoUnitario + custoReal.custosLogistica.reduce((s, c) => s + c.valor, 0))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">sem lote</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(precoTotal)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{p.estoqueTotal}</TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${COR_FATURAMENTO}`}>
                    <CelulaEditavel
                      valor={p.preco_venda != null ? String(p.preco_venda) : ''}
                      exibir={formatCurrency(p.preco_venda)}
                      align="right"
                      tipo="decimal"
                      onSalvar={(v) => salvarCampo(p.id, 'preco_venda', paraNumero(v))}
                    />
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
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">{formatCurrency(valorAds)}</TableCell>
                  <TableCell className={`text-right whitespace-nowrap font-medium ${corLinha}`}>
                    {formatPct(margemPct)}
                    {margemPct != null && !usandoCustoReal && (
                      <span className="text-[10px] text-muted-foreground font-normal ml-1" title="Sem lote cadastrado ainda — usando o custo estimado do cadastro, não o custo real de compra.">est.</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${corLinha}`}>{formatCurrency(lucroPorUnidade)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <CelulaEditavel valor={p.vendas_mes != null ? String(p.vendas_mes) : ''} align="right" tipo="numeric" onSalvar={(v) => salvarCampo(p.id, 'vendas_mes', paraInteiro(v))} />
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${corLinha}`}>{formatCurrency(lucroMes)}</TableCell>
                  <TableCell className={`text-right whitespace-nowrap ${corLinha}`}>{formatCurrency(lucroTotal)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {margemBaixa && precoSugerido != null ? (
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${COR_FATURAMENTO}`}>{formatCurrency(precoSugerido)}</span>
                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => aplicarPrecoSugerido(p, precoSugerido)}>
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
                        <DropdownMenuItem onClick={() => abrirEdicao(p)}>Editar (formulário completo)</DropdownMenuItem>
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
        onSaved={carregar}
      />
    </div>
  )
}
