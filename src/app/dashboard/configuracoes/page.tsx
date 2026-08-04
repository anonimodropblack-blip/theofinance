'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { KpiIcon, TONES, TONE_SWATCH, type Tone } from '@/components/dashboard/KpiIcon'
import { NOMES_ICONES_CATEGORIA, iconeCategoria } from '@/lib/categorias-financeiras'
import type { Caixinha, CategoriaCusto, CategoriaFinanceira, Configuracao, FaixaLogisticaFba, FaixaTaxaMarketplacePreco, LocalEstoque } from '@/types'

export default function ConfiguracoesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const [config, setConfig] = useState<Configuracao | null>(null)
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [categorias, setCategorias] = useState<CategoriaCusto[]>([])
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<CategoriaFinanceira[]>([])
  const [faixasFba, setFaixasFba] = useState<FaixaLogisticaFba[]>([])
  const [faixasPreco, setFaixasPreco] = useState<FaixaTaxaMarketplacePreco[]>([])
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([])

  const [imposto, setImposto] = useState('')
  const [margemMinima, setMargemMinima] = useState('')
  const [custoFixoMensal, setCustoFixoMensal] = useState('')
  const [gastoAdsMensal, setGastoAdsMensal] = useState('')
  const [prolaborePiso, setProlaborePiso] = useState('')
  const [prolaboreAlvo, setProlaboreAlvo] = useState('')
  const [prolaborePctExcedente, setProlaborePctExcedente] = useState('')
  const [prolaboreDescontarCustoFixo, setProlaboreDescontarCustoFixo] = useState(true)
  const [prazoReposicaoDias, setPrazoReposicaoDias] = useState('')
  const [estoqueCoberturaDias, setEstoqueCoberturaDias] = useState('')

  const [novoLocalOpen, setNovoLocalOpen] = useState(false)
  const [editandoLocal, setEditandoLocal] = useState<LocalEstoque | null>(null)
  const [novoLocalNome, setNovoLocalNome] = useState('')
  const [novoLocalTipo, setNovoLocalTipo] = useState<'marketplace' | 'proprio'>('marketplace')
  const [novoLocalTaxa, setNovoLocalTaxa] = useState('')
  const [novoLocalModelo, setNovoLocalModelo] = useState<'simples' | 'faixa_preco' | 'faixa_peso'>('simples')
  const [salvandoLocal, setSalvandoLocal] = useState(false)

  const [novaCategoriaOpen, setNovaCategoriaOpen] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)

  const [categoriaFinanceiraDialogOpen, setCategoriaFinanceiraDialogOpen] = useState(false)
  const [editandoCategoriaFinanceira, setEditandoCategoriaFinanceira] = useState<CategoriaFinanceira | null>(null)
  const [nomeCategoriaFinanceira, setNomeCategoriaFinanceira] = useState('')
  const [iconeCategoriaFinanceira, setIconeCategoriaFinanceira] = useState<string>(NOMES_ICONES_CATEGORIA[0])
  const [corCategoriaFinanceira, setCorCategoriaFinanceira] = useState<Tone>('neutral')
  const [salvandoCategoriaFinanceira, setSalvandoCategoriaFinanceira] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: cfg }, { data: locs }, { data: cats }, { data: catsFin }, { data: fxsFba }, { data: fxsPreco }, { data: cxs }] = await Promise.all([
      supabase.from('configuracoes').select('*').single(),
      supabase.from('locais_estoque').select('*').order('ordem'),
      supabase.from('categorias_custo').select('*').order('created_at'),
      supabase.from('categorias_financeiras').select('*').order('created_at'),
      supabase.from('faixas_logistica_fba').select('*'),
      supabase.from('faixas_taxa_marketplace_preco').select('*'),
      supabase.from('caixinhas').select('*').order('ordem'),
    ])
    setConfig(cfg as Configuracao)
    setImposto(cfg ? String(cfg.imposto_percentual) : '')
    setMargemMinima(cfg ? String(cfg.margem_minima_percentual) : '')
    setCustoFixoMensal(cfg ? String(cfg.custo_fixo_mensal) : '')
    setGastoAdsMensal(cfg ? String(cfg.gasto_ads_mensal) : '')
    setProlaborePiso(cfg ? String(cfg.prolabore_piso) : '')
    setProlaboreAlvo(cfg ? String(cfg.prolabore_alvo) : '')
    setProlaborePctExcedente(cfg ? String(cfg.prolabore_pct_excedente) : '')
    setProlaboreDescontarCustoFixo(cfg ? cfg.prolabore_descontar_custo_fixo : true)
    setPrazoReposicaoDias(cfg ? String(cfg.prazo_reposicao_dias) : '')
    setEstoqueCoberturaDias(cfg ? String(cfg.estoque_cobertura_dias) : '')
    setLocais((locs ?? []) as LocalEstoque[])
    setCategorias((cats ?? []) as CategoriaCusto[])
    setCategoriasFinanceiras((catsFin ?? []) as CategoriaFinanceira[])
    setFaixasFba(
      ((fxsFba ?? []) as FaixaLogisticaFba[]).sort((a, b) => {
        if (a.peso_min !== b.peso_min) return a.peso_min - b.peso_min
        return a.preco_min - b.preco_min
      })
    )
    setFaixasPreco(
      ((fxsPreco ?? []) as FaixaTaxaMarketplacePreco[]).sort((a, b) => a.preco_min - b.preco_min)
    )
    setCaixinhas((cxs ?? []) as Caixinha[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSalvandoConfig(true)
    const { error } = await supabase
      .from('configuracoes')
      .update({
        imposto_percentual: Number(imposto.replace(',', '.')) || 0,
        margem_minima_percentual: Number(margemMinima.replace(',', '.')) || 0,
        custo_fixo_mensal: Number(custoFixoMensal.replace(',', '.')) || 0,
        gasto_ads_mensal: Number(gastoAdsMensal.replace(',', '.')) || 0,
        prolabore_piso: Number(prolaborePiso.replace(',', '.')) || 0,
        prolabore_alvo: Number(prolaboreAlvo.replace(',', '.')) || 0,
        prolabore_pct_excedente: Number(prolaborePctExcedente.replace(',', '.')) || 0,
        prolabore_descontar_custo_fixo: prolaboreDescontarCustoFixo,
        prazo_reposicao_dias: Number(prazoReposicaoDias) || 0,
        estoque_cobertura_dias: Number(estoqueCoberturaDias) || 0,
      })
      .eq('id', config.id)
    setSalvandoConfig(false)
    if (error) {
      toast.error('Erro ao salvar configurações.')
      return
    }
    toast.success('Configurações salvas')
    carregar()
  }

  async function atualizarTaxaLocal(local: LocalEstoque, novoValor: string) {
    const valor = Number(novoValor.replace(',', '.'))
    if (Number.isNaN(valor) || valor === local.taxa_marketplace) return
    const { error } = await supabase.from('locais_estoque').update({ taxa_marketplace: valor }).eq('id', local.id)
    if (error) {
      toast.error('Erro ao salvar taxa.')
      return
    }
    setLocais((prev) => prev.map((l) => (l.id === local.id ? { ...l, taxa_marketplace: valor } : l)))
  }

  async function toggleFbaLogisticaAtiva(local: LocalEstoque) {
    const { error } = await supabase.from('locais_estoque').update({ fba_logistica_ativa: !local.fba_logistica_ativa }).eq('id', local.id)
    if (error) {
      toast.error('Erro ao atualizar local.')
      return
    }
    setLocais((prev) => prev.map((l) => (l.id === local.id ? { ...l, fba_logistica_ativa: !l.fba_logistica_ativa } : l)))
  }

  function abrirNovoLocal() {
    setEditandoLocal(null)
    setNovoLocalNome('')
    setNovoLocalTaxa('')
    setNovoLocalTipo('marketplace')
    setNovoLocalModelo('simples')
    setNovoLocalOpen(true)
  }

  function abrirEdicaoLocal(local: LocalEstoque) {
    setEditandoLocal(local)
    setNovoLocalNome(local.nome)
    setNovoLocalTaxa(local.taxa_marketplace != null ? String(local.taxa_marketplace) : '')
    setNovoLocalTipo(local.tipo)
    setNovoLocalModelo(local.usa_taxa_por_faixa ? 'faixa_preco' : local.usa_tarifa_fba ? 'faixa_peso' : 'simples')
    setNovoLocalOpen(true)
  }

  async function salvarLocal(e: React.FormEvent) {
    e.preventDefault()
    const nome = novoLocalNome.trim()
    if (!nome) return
    setSalvandoLocal(true)
    const taxaNumero = Number(novoLocalTaxa.replace(',', '.')) || 0
    const payload = {
      nome,
      tipo: novoLocalTipo,
      taxa_marketplace: novoLocalTipo === 'marketplace' ? taxaNumero : null,
      usa_taxa_por_faixa: novoLocalTipo === 'marketplace' && novoLocalModelo === 'faixa_preco',
      usa_tarifa_fba: novoLocalTipo === 'marketplace' && novoLocalModelo === 'faixa_peso',
    }
    const { error } = editandoLocal
      ? await supabase.from('locais_estoque').update(payload).eq('id', editandoLocal.id)
      : await supabase.from('locais_estoque').insert({
          ...payload,
          ativo: true,
          fba_logistica_ativa: novoLocalModelo === 'faixa_peso',
          ordem: locais.length,
        })
    setSalvandoLocal(false)
    if (error) {
      toast.error('Erro ao salvar local.')
      return
    }
    toast.success(editandoLocal ? 'Local atualizado' : 'Local criado')
    setNovoLocalOpen(false)
    carregar()
  }

  async function atualizarFaixaFba(faixa: FaixaLogisticaFba, campo: 'peso_min' | 'peso_max' | 'preco_min' | 'preco_max' | 'valor_fixo', valorTexto: string) {
    const semLimite = (campo === 'peso_max' || campo === 'preco_max') && valorTexto.trim() === ''
    const valor = semLimite ? null : Number(valorTexto.replace(',', '.'))
    if (!semLimite && Number.isNaN(valor)) return
    const { error } = await supabase.from('faixas_logistica_fba').update({ [campo]: valor }).eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao salvar faixa.')
      return
    }
    carregar()
  }

  async function criarFaixaFba(localId: string) {
    const { error } = await supabase.from('faixas_logistica_fba').insert({ local_id: localId, peso_min: 0, peso_max: null, preco_min: 0, preco_max: null, valor_fixo: 0 })
    if (error) {
      toast.error('Erro ao criar faixa.')
      return
    }
    carregar()
  }

  async function excluirFaixaFba(faixa: FaixaLogisticaFba) {
    const { error } = await supabase.from('faixas_logistica_fba').delete().eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao excluir faixa.')
      return
    }
    setFaixasFba((prev) => prev.filter((f) => f.id !== faixa.id))
  }

  async function toggleAtivoFaixaFba(faixa: FaixaLogisticaFba) {
    const { error } = await supabase.from('faixas_logistica_fba').update({ ativo: !faixa.ativo }).eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao atualizar faixa.')
      return
    }
    setFaixasFba((prev) => prev.map((f) => (f.id === faixa.id ? { ...f, ativo: !f.ativo } : f)))
  }

  async function toggleAtivoFaixaPreco(faixa: FaixaTaxaMarketplacePreco) {
    const { error } = await supabase.from('faixas_taxa_marketplace_preco').update({ ativo: !faixa.ativo }).eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao atualizar faixa.')
      return
    }
    setFaixasPreco((prev) => prev.map((f) => (f.id === faixa.id ? { ...f, ativo: !f.ativo } : f)))
  }

  async function atualizarFaixaPreco(faixa: FaixaTaxaMarketplacePreco, campo: 'preco_min' | 'preco_max' | 'taxa_percentual' | 'valor_fixo', valorTexto: string) {
    const semLimite = campo === 'preco_max' && valorTexto.trim() === ''
    const valor = semLimite ? null : Number(valorTexto.replace(',', '.'))
    if (!semLimite && Number.isNaN(valor)) return
    const { error } = await supabase.from('faixas_taxa_marketplace_preco').update({ [campo]: valor }).eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao salvar faixa.')
      return
    }
    carregar()
  }

  async function criarFaixaPreco(localId: string) {
    const { error } = await supabase.from('faixas_taxa_marketplace_preco').insert({ local_id: localId, preco_min: 0, preco_max: null, taxa_percentual: 0, valor_fixo: 0 })
    if (error) {
      toast.error('Erro ao criar faixa.')
      return
    }
    carregar()
  }

  async function excluirFaixaPreco(faixa: FaixaTaxaMarketplacePreco) {
    const { error } = await supabase.from('faixas_taxa_marketplace_preco').delete().eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao excluir faixa.')
      return
    }
    setFaixasPreco((prev) => prev.filter((f) => f.id !== faixa.id))
  }

  async function atualizarCaixinha(caixinha: Caixinha, campo: 'nome' | 'percentual', valorTexto: string) {
    const valor = campo === 'percentual' ? Number(valorTexto.replace(',', '.')) : valorTexto.trim()
    if (campo === 'percentual' && Number.isNaN(valor)) return
    if (campo === 'nome' && !valor) return
    const { error } = await supabase.from('caixinhas').update({ [campo]: valor }).eq('id', caixinha.id)
    if (error) {
      toast.error('Erro ao salvar caixinha.')
      return
    }
    setCaixinhas((prev) => prev.map((c) => (c.id === caixinha.id ? { ...c, [campo]: valor } : c)))
  }

  async function atualizarContaDestinoCaixinha(caixinha: Caixinha, conta: 'operacional' | 'reserva') {
    const { error } = await supabase.from('caixinhas').update({ conta_destino: conta }).eq('id', caixinha.id)
    if (error) {
      toast.error('Erro ao salvar caixinha.')
      return
    }
    setCaixinhas((prev) => prev.map((c) => (c.id === caixinha.id ? { ...c, conta_destino: conta } : c)))
  }

  async function toggleAtivoCaixinha(caixinha: Caixinha) {
    const { error } = await supabase.from('caixinhas').update({ ativo: !caixinha.ativo }).eq('id', caixinha.id)
    if (error) {
      toast.error('Erro ao atualizar caixinha.')
      return
    }
    setCaixinhas((prev) => prev.map((c) => (c.id === caixinha.id ? { ...c, ativo: !c.ativo } : c)))
  }

  async function criarCaixinha() {
    const { error } = await supabase.from('caixinhas').insert({ nome: 'Nova caixinha', percentual: 0, ordem: caixinhas.length })
    if (error) {
      toast.error('Erro ao criar caixinha.')
      return
    }
    carregar()
  }

  async function excluirCaixinha(caixinha: Caixinha) {
    const { error } = await supabase.from('caixinhas').delete().eq('id', caixinha.id)
    if (error) {
      toast.error('Erro ao excluir caixinha.')
      return
    }
    setCaixinhas((prev) => prev.filter((c) => c.id !== caixinha.id))
  }

  async function toggleAtivoLocal(local: LocalEstoque) {
    const { error } = await supabase.from('locais_estoque').update({ ativo: !local.ativo }).eq('id', local.id)
    if (error) {
      toast.error('Erro ao atualizar local.')
      return
    }
    setLocais((prev) => prev.map((l) => (l.id === local.id ? { ...l, ativo: !l.ativo } : l)))
  }

  async function excluirLocal(local: LocalEstoque) {
    const { data: estoqueLocal } = await supabase.from('estoque').select('quantidade').eq('local_id', local.id)
    if ((estoqueLocal ?? []).some((e) => e.quantidade > 0)) {
      toast.error('Esse local tem estoque. Zere o estoque ou desative em vez de excluir.')
      return
    }
    if (!window.confirm(`Excluir "${local.nome}"? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('locais_estoque').delete().eq('id', local.id)
    if (error) {
      toast.error('Não deu pra excluir — esse local já tem movimentações, pedidos ou fechamentos vinculados. Desative em vez de excluir.')
      return
    }
    toast.success('Local excluído')
    carregar()
  }

  async function toggleAtivoCategoria(categoria: CategoriaCusto) {
    const { error } = await supabase.from('categorias_custo').update({ ativo: !categoria.ativo }).eq('id', categoria.id)
    if (error) {
      toast.error('Erro ao atualizar categoria.')
      return
    }
    setCategorias((prev) => prev.map((c) => (c.id === categoria.id ? { ...c, ativo: !c.ativo } : c)))
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault()
    const nome = novaCategoriaNome.trim()
    if (!nome) return
    setSalvandoCategoria(true)
    const { error } = await supabase.from('categorias_custo').insert({ nome, ativo: true, padrao: false })
    setSalvandoCategoria(false)
    if (error) {
      toast.error('Erro ao criar categoria.')
      return
    }
    toast.success('Categoria criada')
    setNovaCategoriaNome('')
    setNovaCategoriaOpen(false)
    carregar()
  }

  async function toggleAtivoCategoriaFinanceira(categoria: CategoriaFinanceira) {
    const { error } = await supabase.from('categorias_financeiras').update({ ativo: !categoria.ativo }).eq('id', categoria.id)
    if (error) {
      toast.error('Erro ao atualizar categoria.')
      return
    }
    setCategoriasFinanceiras((prev) => prev.map((c) => (c.id === categoria.id ? { ...c, ativo: !c.ativo } : c)))
  }

  function abrirNovaCategoriaFinanceira() {
    setEditandoCategoriaFinanceira(null)
    setNomeCategoriaFinanceira('')
    setIconeCategoriaFinanceira(NOMES_ICONES_CATEGORIA[0])
    setCorCategoriaFinanceira('neutral')
    setCategoriaFinanceiraDialogOpen(true)
  }

  function abrirEdicaoCategoriaFinanceira(categoria: CategoriaFinanceira) {
    setEditandoCategoriaFinanceira(categoria)
    setNomeCategoriaFinanceira(categoria.nome)
    setIconeCategoriaFinanceira(categoria.icone)
    setCorCategoriaFinanceira((categoria.cor in TONES ? categoria.cor : 'neutral') as Tone)
    setCategoriaFinanceiraDialogOpen(true)
  }

  async function salvarCategoriaFinanceira(e: React.FormEvent) {
    e.preventDefault()
    const nome = nomeCategoriaFinanceira.trim()
    if (!nome) return
    setSalvandoCategoriaFinanceira(true)
    const payload = { nome, icone: iconeCategoriaFinanceira, cor: corCategoriaFinanceira }
    const { error } = editandoCategoriaFinanceira
      ? await supabase.from('categorias_financeiras').update(payload).eq('id', editandoCategoriaFinanceira.id)
      : await supabase.from('categorias_financeiras').insert({ ...payload, ativo: true, padrao: false })
    setSalvandoCategoriaFinanceira(false)
    if (error) {
      toast.error('Erro ao salvar categoria.')
      return
    }
    toast.success(editandoCategoriaFinanceira ? 'Categoria atualizada' : 'Categoria criada')
    setCategoriaFinanceiraDialogOpen(false)
    carregar()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Impostos e Margem</CardTitle>
          <CardDescription>Usados no cálculo de precificação, dashboard e projeção de produtos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarConfig} className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="imposto">Imposto (%)</Label>
                <Input id="imposto" inputMode="decimal" value={imposto} onChange={(e) => setImposto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem_minima">Margem mínima (%)</Label>
                <Input id="margem_minima" inputMode="decimal" value={margemMinima} onChange={(e) => setMargemMinima(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custo_fixo_mensal">Custo fixo mensal (R$)</Label>
                <Input id="custo_fixo_mensal" inputMode="decimal" placeholder="0,00" value={custoFixoMensal} onChange={(e) => setCustoFixoMensal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gasto_ads_mensal">Gasto com Ads no mês (R$)</Label>
                <Input id="gasto_ads_mensal" inputMode="decimal" placeholder="0,00" value={gastoAdsMensal} onChange={(e) => setGastoAdsMensal(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Custo fixo mensal = assinaturas/mensalidades de marketplace (ex: Plano Profissional Amazon R$19/mês). Não entra na margem por produto, só aparece como referência no Dashboard.
              Gasto com Ads no mês = total investido em anúncios, diluído automaticamente entre os produtos proporcional às vendas/mês de cada um — só é usado no produto se ele não tiver um Ads manual definido na tabela de Produtos.
            </p>
            <Button type="submit" disabled={salvandoConfig}>
              {salvandoConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pró-labore</CardTitle>
          <CardDescription>Regra de quanto você retira de salário por mês, calculada em cima do lucro líquido.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarConfig} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prolabore_piso">Piso (R$)</Label>
                <Input id="prolabore_piso" inputMode="decimal" placeholder="0,00" value={prolaborePiso} onChange={(e) => setProlaborePiso(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prolabore_alvo">Alvo / salário confortável (R$)</Label>
                <Input id="prolabore_alvo" inputMode="decimal" placeholder="0,00" value={prolaboreAlvo} onChange={(e) => setProlaboreAlvo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prolabore_pct">% sobre o que passar do alvo</Label>
                <Input id="prolabore_pct" inputMode="decimal" placeholder="0,00" value={prolaborePctExcedente} onChange={(e) => setProlaborePctExcedente(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="prolabore_desconta_custo_fixo" checked={prolaboreDescontarCustoFixo} onCheckedChange={(v) => setProlaboreDescontarCustoFixo(v === true)} />
              <Label htmlFor="prolabore_desconta_custo_fixo" className="font-normal">Descontar o Custo Fixo Mensal do lucro antes de calcular</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Até o alvo, você recebe o lucro cheio do mês. Acima do alvo, você recebe o alvo fixo + a % configurada sobre o que passar disso — o resto fica na empresa. O piso é só um aviso: se o valor calculado ficar abaixo dele, o Dashboard mostra um alerta.
            </p>
            <Button type="submit" disabled={salvandoConfig}>
              {salvandoConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reposição de Estoque</CardTitle>
          <CardDescription>Usado pra calcular quanto pedir no próximo lote, na tela de Produtos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarConfig} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="prazo_reposicao_dias">Prazo de produção + envio (dias)</Label>
                <Input id="prazo_reposicao_dias" inputMode="numeric" placeholder="30" value={prazoReposicaoDias} onChange={(e) => setPrazoReposicaoDias(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estoque_cobertura_dias">Cobertura desejada depois que chegar (dias)</Label>
                <Input id="estoque_cobertura_dias" inputMode="numeric" placeholder="60" value={estoqueCoberturaDias} onChange={(e) => setEstoqueCoberturaDias(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A sugestão de compra usa a média real de vendas/dia (calculada a partir dos meses já fechados) pra cobrir o tempo até o próximo pedido chegar, mais os dias de estoque extra que você quer manter depois. Sem histórico de pelo menos um mês fechado pra um produto, a sugestão não aparece pra ele ainda.
            </p>
            <Button type="submit" disabled={salvandoConfig}>
              {salvandoConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Caixinhas</CardTitle>
          <CardDescription>Divisão do que sobra do lucro depois do pró-labore. Edite o nome e o percentual de cada uma — a soma deveria fechar 100%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Percentual</TableHead>
                <TableHead>Vai para a conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {caixinhas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Input defaultValue={c.nome} onBlur={(e) => atualizarCaixinha(c, 'nome', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      defaultValue={String(c.percentual)}
                      inputMode="decimal"
                      className="w-20 ml-auto text-right"
                      onBlur={(e) => atualizarCaixinha(c, 'percentual', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={c.conta_destino} onValueChange={(v) => atualizarContaDestinoCaixinha(c, (v ?? 'operacional') as 'operacional' | 'reserva')}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="reserva">Reserva/CDB</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => toggleAtivoCaixinha(c)}>
                      <Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluirCaixinha(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={criarCaixinha}>
              <Plus className="h-4 w-4" />
              Nova caixinha
            </Button>
            {(() => {
              const soma = caixinhas.filter((c) => c.ativo).reduce((s, c) => s + c.percentual, 0)
              return (
                <p className={`text-xs ${Math.abs(soma - 100) < 0.01 ? 'text-muted-foreground' : 'text-destructive'}`}>
                  Soma das caixinhas ativas: {soma.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  {Math.abs(soma - 100) >= 0.01 && ' (deveria fechar 100%)'}
                </p>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketplaces e Locais de Estoque</CardTitle>
          <CardDescription>Taxa usada na Precificação e no Dashboard. Locais inativos somem dos seletores.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Local</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">{locais.some((l) => l.usa_tarifa_fba) ? 'Comissão (%)' : 'Taxa (%)'}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logística por Peso</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locais.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{l.tipo === 'marketplace' ? 'Marketplace' : 'Próprio'}</TableCell>
                  <TableCell className="text-right">
                    {l.usa_taxa_por_faixa ? (
                      <span className="text-muted-foreground text-xs">Ver faixas abaixo</span>
                    ) : l.tipo === 'marketplace' ? (
                      <Input
                        defaultValue={String(l.taxa_marketplace ?? 0)}
                        inputMode="decimal"
                        className="w-20 ml-auto text-right"
                        onBlur={(e) => atualizarTaxaLocal(l, e.target.value)}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => toggleAtivoLocal(l)}>
                      <Badge variant={l.ativo ? 'default' : 'secondary'}>{l.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    {l.usa_tarifa_fba ? (
                      <button type="button" onClick={() => toggleFbaLogisticaAtiva(l)}>
                        <Badge variant={l.fba_logistica_ativa ? 'default' : 'secondary'}>
                          {l.fba_logistica_ativa ? 'Cobrando' : 'Grátis (promoção)'}
                        </Badge>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicaoLocal(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluirLocal(l)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
          <Button type="button" variant="outline" size="sm" onClick={abrirNovoLocal}>
            <Plus className="h-4 w-4" />
            Novo local
          </Button>
        </CardContent>
      </Card>

      <Dialog open={novoLocalOpen} onOpenChange={setNovoLocalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoLocal ? 'Editar local / marketplace' : 'Novo local / marketplace'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarLocal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novo_local_nome">Nome</Label>
              <Input
                id="novo_local_nome"
                placeholder="ex: Mercado Livre, Shopee, Loja Própria..."
                value={novoLocalNome}
                onChange={(e) => setNovoLocalNome(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={novoLocalTipo}
                onValueChange={(v) => setNovoLocalTipo((v ?? 'marketplace') as 'marketplace' | 'proprio')}
                items={{ marketplace: 'Marketplace (cobra taxa/comissão)', proprio: 'Próprio (loja própria, casa, depósito)' }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketplace">Marketplace (cobra taxa/comissão)</SelectItem>
                  <SelectItem value="proprio">Próprio (loja própria, casa, depósito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {novoLocalTipo === 'marketplace' && (
              <div className="space-y-2">
                <Label>Modelo de taxa</Label>
                <Select
                  value={novoLocalModelo}
                  onValueChange={(v) => setNovoLocalModelo((v ?? 'simples') as 'simples' | 'faixa_preco' | 'faixa_peso')}
                  items={{
                    simples: 'Taxa simples (%)',
                    faixa_preco: 'Comissão por faixa de preço',
                    faixa_peso: 'Comissão + logística por peso (estilo Amazon)',
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Taxa simples (%)</SelectItem>
                    <SelectItem value="faixa_preco">Comissão por faixa de preço</SelectItem>
                    <SelectItem value="faixa_peso">Comissão + logística por peso (estilo Amazon)</SelectItem>
                  </SelectContent>
                </Select>
                {novoLocalModelo !== 'simples' && (
                  <p className="text-xs text-muted-foreground">
                    As faixas em si (valores por preço{novoLocalModelo === 'faixa_peso' ? '/peso' : ''}) se cadastram
                    depois de salvar, nos cards abaixo.
                  </p>
                )}
              </div>
            )}
            {novoLocalTipo === 'marketplace' && (
              <div className="space-y-2">
                <Label htmlFor="novo_local_taxa">{novoLocalModelo === 'faixa_peso' ? 'Comissão base (%)' : 'Taxa/comissão (%)'}</Label>
                <Input
                  id="novo_local_taxa"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={novoLocalTaxa}
                  onChange={(e) => setNovoLocalTaxa(e.target.value)}
                  disabled={novoLocalModelo === 'faixa_preco'}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={salvandoLocal}>
                {salvandoLocal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Tarifa de Logística por Peso</CardTitle>
          <CardDescription>
            Valor fixo em R$ por unidade, conforme peso do produto e faixa de preço de venda — modelo usado pela Amazon FBA, disponível pra qualquer local cadastrado como &ldquo;Comissão + logística por peso&rdquo;. Só é cobrada quando &ldquo;Logística por Peso&rdquo; estiver marcada como &ldquo;Cobrando&rdquo; na tabela de locais acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {locais.filter((l) => l.usa_tarifa_fba).map((l) => (
            <div key={l.id} className="space-y-2">
              <p className="text-sm font-semibold">{l.nome}</p>
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Peso de (g)</TableHead>
                    <TableHead className="text-right">Peso até (g)</TableHead>
                    <TableHead className="text-right">Preço de</TableHead>
                    <TableHead className="text-right">Preço até</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faixasFba.filter((f) => f.local_id === l.id).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={String(f.peso_min)}
                          inputMode="numeric"
                          className="w-20 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaFba(f, 'peso_min', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={f.peso_max == null ? '' : String(f.peso_max)}
                          placeholder="Sem limite"
                          inputMode="numeric"
                          className="w-24 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaFba(f, 'peso_max', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={String(f.preco_min)}
                          inputMode="decimal"
                          className="w-20 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaFba(f, 'preco_min', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={f.preco_max == null ? '' : String(f.preco_max)}
                          placeholder="Sem limite"
                          inputMode="decimal"
                          className="w-24 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaFba(f, 'preco_max', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={String(f.valor_fixo)}
                          inputMode="decimal"
                          className="w-20 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaFba(f, 'valor_fixo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => toggleAtivoFaixaFba(f)}>
                          <Badge variant={f.ativo ? 'default' : 'secondary'}>{f.ativo ? 'Ativa' : 'Inativa'}</Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluirFaixaFba(f)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
              <Button type="button" variant="outline" size="sm" onClick={() => criarFaixaFba(l.id)}>
                <Plus className="h-4 w-4" />
                Nova faixa
              </Button>
            </div>
          ))}
          {locais.filter((l) => l.usa_tarifa_fba).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum local usa esse modelo ainda. Cadastre ou edite um marketplace acima com &ldquo;Comissão + logística por peso&rdquo;.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faixas de Taxa por Preço</CardTitle>
          <CardDescription>
            Comissão % e valor fixo em R$ variam conforme a faixa de preço de venda — usado por Mercado Livre, Shopee e TikTok. Pesquisado em 20/07/2026, ajustar se o marketplace mudar a tabela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {locais.filter((l) => l.usa_taxa_por_faixa).map((l) => (
            <div key={l.id} className="space-y-2">
              <p className="text-sm font-semibold">{l.nome}</p>
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Preço de</TableHead>
                    <TableHead className="text-right">Preço até</TableHead>
                    <TableHead className="text-right">Comissão (%)</TableHead>
                    <TableHead className="text-right">Valor Fixo (R$)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faixasPreco.filter((f) => f.local_id === l.id).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={String(f.preco_min)}
                          inputMode="decimal"
                          className="w-20 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaPreco(f, 'preco_min', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={f.preco_max == null ? '' : String(f.preco_max)}
                          placeholder="Sem limite"
                          inputMode="decimal"
                          className="w-24 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaPreco(f, 'preco_max', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={String(f.taxa_percentual)}
                          inputMode="decimal"
                          className="w-20 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaPreco(f, 'taxa_percentual', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          defaultValue={String(f.valor_fixo)}
                          inputMode="decimal"
                          className="w-20 ml-auto text-right"
                          onBlur={(e) => atualizarFaixaPreco(f, 'valor_fixo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => toggleAtivoFaixaPreco(f)}>
                          <Badge variant={f.ativo ? 'default' : 'secondary'}>{f.ativo ? 'Ativa' : 'Inativa'}</Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluirFaixaPreco(f)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
              <Button type="button" variant="outline" size="sm" onClick={() => criarFaixaPreco(l.id)}>
                <Plus className="h-4 w-4" />
                Nova faixa
              </Button>
            </div>
          ))}
          {locais.filter((l) => l.usa_taxa_por_faixa).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum local usa esse modelo ainda. Cadastre ou edite um marketplace acima com &ldquo;Comissão por faixa de preço&rdquo;.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias de Custo</CardTitle>
          <CardDescription>Usadas ao lançar custos de lote (frete, embalagem etc). Desativar não apaga histórico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.padrao ? 'Padrão' : 'Personalizada'}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => toggleAtivoCategoria(c)}>
                      <Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setNovaCategoriaOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Financeiras</CardTitle>
          <CardDescription>Usadas nos lançamentos do Financeiro. Desativar não apaga histórico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriasFinanceiras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><KpiIcon icon={iconeCategoria(c.icone)} tone={(c.cor in TONES ? c.cor : 'neutral') as Tone} /></TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.padrao ? 'Padrão' : 'Personalizada'}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => toggleAtivoCategoriaFinanceira(c)}>
                      <Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicaoCategoriaFinanceira(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
          <Button type="button" variant="outline" size="sm" onClick={abrirNovaCategoriaFinanceira}>
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        </CardContent>
      </Card>

      <Dialog open={categoriaFinanceiraDialogOpen} onOpenChange={setCategoriaFinanceiraDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoCategoriaFinanceira ? 'Editar categoria' : 'Nova categoria financeira'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarCategoriaFinanceira} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_categoria_financeira">Nome</Label>
              <Input
                id="nome_categoria_financeira"
                value={nomeCategoriaFinanceira}
                onChange={(e) => setNomeCategoriaFinanceira(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-8 gap-2">
                {NOMES_ICONES_CATEGORIA.map((nomeIcone) => {
                  const Icon = iconeCategoria(nomeIcone)
                  const selecionado = iconeCategoriaFinanceira === nomeIcone
                  return (
                    <button
                      key={nomeIcone}
                      type="button"
                      onClick={() => setIconeCategoriaFinanceira(nomeIcone)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${selecionado ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {(Object.keys(TONES) as Tone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCorCategoriaFinanceira(t)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${corCategoriaFinanceira === t ? 'border-foreground' : 'border-transparent'}`}
                  >
                    <span className={`h-5 w-5 rounded-full ${TONE_SWATCH[t]}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border p-3">
              <KpiIcon icon={iconeCategoria(iconeCategoriaFinanceira)} tone={corCategoriaFinanceira} />
              <span className="text-sm text-muted-foreground">Pré-visualização</span>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={salvandoCategoriaFinanceira}>
                {salvandoCategoriaFinanceira ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={novaCategoriaOpen} onOpenChange={setNovaCategoriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria de custo</DialogTitle>
          </DialogHeader>
          <form onSubmit={criarCategoria} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova_categoria">Nome</Label>
              <Input
                id="nova_categoria"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={salvandoCategoria}>
                {salvandoCategoria ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
