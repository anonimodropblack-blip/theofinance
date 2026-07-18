'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { CategoriaCusto, Configuracao, FaixaLogisticaFba, FaixaTaxaMarketplace, LocalEstoque } from '@/types'

export default function ConfiguracoesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const [config, setConfig] = useState<Configuracao | null>(null)
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [categorias, setCategorias] = useState<CategoriaCusto[]>([])
  const [faixas, setFaixas] = useState<FaixaTaxaMarketplace[]>([])
  const [faixasFba, setFaixasFba] = useState<FaixaLogisticaFba[]>([])

  const [imposto, setImposto] = useState('')
  const [margemMinima, setMargemMinima] = useState('')

  const [novaCategoriaOpen, setNovaCategoriaOpen] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: cfg }, { data: locs }, { data: cats }, { data: fxs }, { data: fxsFba }] = await Promise.all([
      supabase.from('configuracoes').select('*').single(),
      supabase.from('locais_estoque').select('*').order('ordem'),
      supabase.from('categorias_custo').select('*').order('created_at'),
      supabase.from('faixas_taxa_marketplace').select('*'),
      supabase.from('faixas_logistica_fba').select('*'),
    ])
    setConfig(cfg as Configuracao)
    setImposto(cfg ? String(cfg.imposto_percentual) : '')
    setMargemMinima(cfg ? String(cfg.margem_minima_percentual) : '')
    setLocais((locs ?? []) as LocalEstoque[])
    setCategorias((cats ?? []) as CategoriaCusto[])
    setFaixas(
      ((fxs ?? []) as FaixaTaxaMarketplace[]).sort((a, b) => {
        if (a.ate_valor == null) return 1
        if (b.ate_valor == null) return -1
        return a.ate_valor - b.ate_valor
      })
    )
    setFaixasFba(
      ((fxsFba ?? []) as FaixaLogisticaFba[]).sort((a, b) => {
        if (a.peso_min !== b.peso_min) return a.peso_min - b.peso_min
        return a.preco_min - b.preco_min
      })
    )
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

  async function atualizarFaixa(faixa: FaixaTaxaMarketplace, campo: 'ate_valor' | 'taxa_percentual', valorTexto: string) {
    const semLimite = campo === 'ate_valor' && valorTexto.trim() === ''
    const valor = semLimite ? null : Number(valorTexto.replace(',', '.'))
    if (!semLimite && Number.isNaN(valor)) return
    const atual = campo === 'ate_valor' ? faixa.ate_valor : faixa.taxa_percentual
    if (valor === atual) return
    const { error } = await supabase.from('faixas_taxa_marketplace').update({ [campo]: valor }).eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao salvar faixa.')
      return
    }
    carregar()
  }

  async function criarFaixa() {
    const { error } = await supabase.from('faixas_taxa_marketplace').insert({ ate_valor: 0, taxa_percentual: 0 })
    if (error) {
      toast.error('Erro ao criar faixa.')
      return
    }
    carregar()
  }

  async function excluirFaixa(faixa: FaixaTaxaMarketplace) {
    const { error } = await supabase.from('faixas_taxa_marketplace').delete().eq('id', faixa.id)
    if (error) {
      toast.error('Erro ao excluir faixa.')
      return
    }
    setFaixas((prev) => prev.filter((f) => f.id !== faixa.id))
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

  async function criarFaixaFba() {
    const { error } = await supabase.from('faixas_logistica_fba').insert({ peso_min: 0, peso_max: null, preco_min: 0, preco_max: null, valor_fixo: 0 })
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

  async function toggleAtivoLocal(local: LocalEstoque) {
    const { error } = await supabase.from('locais_estoque').update({ ativo: !local.ativo }).eq('id', local.id)
    if (error) {
      toast.error('Erro ao atualizar local.')
      return
    }
    setLocais((prev) => prev.map((l) => (l.id === local.id ? { ...l, ativo: !l.ativo } : l)))
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="imposto">Imposto (%)</Label>
                <Input id="imposto" inputMode="decimal" value={imposto} onChange={(e) => setImposto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem_minima">Margem mínima (%)</Label>
                <Input id="margem_minima" inputMode="decimal" value={margemMinima} onChange={(e) => setMargemMinima(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={salvandoConfig}>
              {salvandoConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faixas de Comissão por Preço</CardTitle>
          <CardDescription>
            Usadas na projeção de lucro da tela de Produtos: quanto menor o preço de venda, maior a taxa. A faixa "Sem limite" (última) é usada pra qualquer preço acima de todas as outras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faixa</TableHead>
                <TableHead className="text-right">Taxa (%)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {faixas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Até R$</span>
                    <Input
                      defaultValue={f.ate_valor == null ? '' : String(f.ate_valor)}
                      placeholder="Sem limite"
                      inputMode="decimal"
                      className="w-28"
                      onBlur={(e) => atualizarFaixa(f, 'ate_valor', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      defaultValue={String(f.taxa_percentual)}
                      inputMode="decimal"
                      className="w-20 ml-auto text-right"
                      onBlur={(e) => atualizarFaixa(f, 'taxa_percentual', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluirFaixa(f)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="button" variant="outline" size="sm" onClick={criarFaixa}>
            <Plus className="h-4 w-4" />
            Nova faixa
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketplaces e Locais de Estoque</CardTitle>
          <CardDescription>Taxa usada na Precificação e no Dashboard. Locais inativos somem dos seletores.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Local</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">{locais.some((l) => l.usa_tarifa_fba) ? 'Comissão (%)' : 'Taxa (%)'}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logística FBA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locais.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{l.tipo === 'marketplace' ? 'Marketplace' : 'Próprio'}</TableCell>
                  <TableCell className="text-right">
                    {l.tipo === 'marketplace' ? (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifa de Logística FBA</CardTitle>
          <CardDescription>
            Valor fixo em R$ por unidade, conforme peso do produto e faixa de preço de venda — tabela oficial da Amazon Brasil. Só é cobrada quando "Logística FBA" estiver marcado como "Cobrando" acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Peso de (g)</TableHead>
                <TableHead className="text-right">Peso até (g)</TableHead>
                <TableHead className="text-right">Preço de</TableHead>
                <TableHead className="text-right">Preço até</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {faixasFba.map((f) => (
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
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluirFaixaFba(f)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="button" variant="outline" size="sm" onClick={criarFaixaFba}>
            <Plus className="h-4 w-4" />
            Nova faixa
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias de Custo</CardTitle>
          <CardDescription>Usadas ao lançar custos de lote (frete, embalagem etc). Desativar não apaga histórico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
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
          </Table>
          <Button type="button" variant="outline" size="sm" onClick={() => setNovaCategoriaOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        </CardContent>
      </Card>

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
