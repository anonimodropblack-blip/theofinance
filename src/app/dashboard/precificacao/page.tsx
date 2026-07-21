'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { calcularPrecificacao } from '@/lib/precificacao'
import { calcularCustoRealPorProduto, type LoteCustoComCategoria, type LoteItemComLote } from '@/lib/custo-real'
import { COR_FATURAMENTO, corMargem } from '@/lib/cores'
import type { Configuracao, FaixaLogisticaFba, FaixaTaxaMarketplacePreco, LocalEstoque, Produto } from '@/types'

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
  const [faixasPreco, setFaixasPreco] = useState<FaixaTaxaMarketplacePreco[]>([])
  const [loteItens, setLoteItens] = useState<LoteItemComLote[]>([])
  const [loteCustos, setLoteCustos] = useState<LoteCustoComCategoria[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [localId, setLocalId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarBase() {
      const [{ data: prods }, { data: locs }, { data: cfg }, { data: fxs }, { data: fxsPreco }, { data: itens }, { data: custos }] = await Promise.all([
        supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
        supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
        supabase.from('configuracoes').select('*').single(),
        supabase.from('faixas_logistica_fba').select('*'),
        supabase.from('faixas_taxa_marketplace_preco').select('*'),
        supabase.from('lote_itens').select('*, lote:lotes(*)'),
        supabase.from('lote_custos').select('*, categoria:categorias_custo(*)'),
      ])
      setProdutos((prods ?? []) as Produto[])
      setLocais((locs ?? []) as LocalEstoque[])
      setConfig(cfg as Configuracao)
      setFaixasFba((fxs ?? []) as FaixaLogisticaFba[])
      setFaixasPreco((fxsPreco ?? []) as FaixaTaxaMarketplacePreco[])
      setLoteItens((itens ?? []) as LoteItemComLote[])
      setLoteCustos((custos ?? []) as LoteCustoComCategoria[])
      if (prods && prods.length > 0) setProdutoId(prods[0].id)
      if (locs && locs.length > 0) {
        const marketplace = locs.find((l) => l.tipo === 'marketplace')
        setLocalId((marketplace ?? locs[0]).id)
      }
      setLoading(false)
    }
    carregarBase()
  }, [supabase])

  const custoRealPorProduto = useMemo(() => calcularCustoRealPorProduto(loteItens, loteCustos), [loteItens, loteCustos])

  const produto = produtos.find((p) => p.id === produtoId) ?? null
  const local = locais.find((l) => l.id === localId) ?? null
  const custoReal = produto ? custoRealPorProduto[produto.id] ?? null : null
  const semLote = produto != null && custoReal == null

  const precoVenda = produto?.preco_venda ?? 0
  const custoFixoTotal = (custoReal?.custoUnitario ?? 0) + (custoReal?.custosLogistica.reduce((s, c) => s + c.valor, 0) ?? 0)

  const totalVendasMes = produtos.reduce((s, p) => s + (p.vendas_mes ?? 0), 0)
  const adsDiluidoPorUnidade = totalVendasMes > 0 ? (config?.gasto_ads_mensal ?? 0) / totalVendasMes : 0
  const usandoAdsDiluido = produto?.ads_modo == null && adsDiluidoPorUnidade > 0
  const adsModoEfetivo = produto?.ads_modo ?? (usandoAdsDiluido ? 'valor' : null)
  const adsValorEfetivo = produto?.ads_modo != null ? produto.ads_valor : adsDiluidoPorUnidade

  const r = calcularPrecificacao({
    precoVenda,
    pesoGramas: produto?.peso_gramas ?? null,
    custoFixoTotal,
    local,
    faixasFba,
    faixasPreco,
    impostoPercentual: config?.imposto_percentual ?? 0,
    margemMinimaPercentual: config?.margem_minima_percentual ?? 0,
    adsModo: adsModoEfetivo,
    adsValor: adsValorEfetivo,
  })

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
            <span>{formatCurrency(custoReal?.custoUnitario ?? 0)}</span>
          </div>
          {(custoReal?.custosLogistica ?? []).map((c) => (
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
            <span className="text-muted-foreground">{r.usaTarifaFba || r.usaTaxaPorFaixa ? 'Comissão' : 'Taxa Marketplace'}</span>
            <span>{formatPct(r.taxaPct * 100)}</span>
          </div>
          {r.usaTarifaFba && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tarifa Logística FBA</span>
              {r.pesoFaltando ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                  <CircleHelp className="h-3.5 w-3.5" /> cadastre o peso do produto
                </span>
              ) : (
                <span>{formatCurrency(r.valorTarifaFba)}</span>
              )}
            </div>
          )}
          {r.usaTaxaPorFaixa && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa Fixa</span>
              {r.semFaixaPreco ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                  <CircleHelp className="h-3.5 w-3.5" /> sem faixa cadastrada pra esse preço
                </span>
              ) : (
                <span>{formatCurrency(r.valorFixoFaixa)}</span>
              )}
            </div>
          )}
          {adsModoEfetivo && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Ads {adsModoEfetivo === 'percentual' ? `(${formatPct(adsValorEfetivo ?? 0)})` : ''}
                {usandoAdsDiluido && (
                  <span className="text-[10px] ml-1" title="Sem Ads manual cadastrado — usando o gasto mensal total diluído pelas vendas/mês de todos os produtos.">(dil.)</span>
                )}
              </span>
              <span>{formatCurrency(r.valorAds)}</span>
            </div>
          )}

          <div className="pt-3 mt-2 border-t border-border space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço Atual</span>
              <span className={`font-medium ${COR_FATURAMENTO}`}>{formatCurrency(precoVenda)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lucro</span>
              <span className={`font-medium ${corMargem(r.margem * 100, config?.margem_minima_percentual ?? 0)}`}>{formatCurrency(r.lucro)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Margem</span>
              <span className={`font-medium ${corMargem(r.margem * 100, config?.margem_minima_percentual ?? 0)}`}>{formatPct(r.margem * 100)}</span>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-md text-sm font-medium ${
              r.margemOk ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}
          >
            {r.margemOk ? <CircleCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
            {r.margemOk ? 'Margem OK' : `Margem abaixo de ${formatPct(config?.margem_minima_percentual ?? 0)}`}
          </div>

          {!r.margemOk && r.precoSugerido != null && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Sugestão de venda: </span>
              <span className={`font-semibold ${COR_FATURAMENTO}`}>{formatCurrency(r.precoSugerido)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
