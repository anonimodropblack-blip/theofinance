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
import { Loader2, Plus } from 'lucide-react'
import type { CategoriaCusto, Configuracao, LocalEstoque } from '@/types'

export default function ConfiguracoesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const [config, setConfig] = useState<Configuracao | null>(null)
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [categorias, setCategorias] = useState<CategoriaCusto[]>([])

  const [imposto, setImposto] = useState('')
  const [margemMinima, setMargemMinima] = useState('')
  const [taxaPadrao, setTaxaPadrao] = useState('')

  const [novaCategoriaOpen, setNovaCategoriaOpen] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: cfg }, { data: locs }, { data: cats }] = await Promise.all([
      supabase.from('configuracoes').select('*').single(),
      supabase.from('locais_estoque').select('*').order('ordem'),
      supabase.from('categorias_custo').select('*').order('created_at'),
    ])
    setConfig(cfg as Configuracao)
    setImposto(cfg ? String(cfg.imposto_percentual) : '')
    setMargemMinima(cfg ? String(cfg.margem_minima_percentual) : '')
    setTaxaPadrao(cfg ? String(cfg.taxa_marketplace_padrao_percentual) : '')
    setLocais((locs ?? []) as LocalEstoque[])
    setCategorias((cats ?? []) as CategoriaCusto[])
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
        taxa_marketplace_padrao_percentual: Number(taxaPadrao.replace(',', '.')) || 0,
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="imposto">Imposto (%)</Label>
                <Input id="imposto" inputMode="decimal" value={imposto} onChange={(e) => setImposto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem_minima">Margem mínima (%)</Label>
                <Input id="margem_minima" inputMode="decimal" value={margemMinima} onChange={(e) => setMargemMinima(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa_padrao">Taxa marketplace padrão (%)</Label>
                <Input id="taxa_padrao" inputMode="decimal" value={taxaPadrao} onChange={(e) => setTaxaPadrao(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A taxa padrão é usada na projeção de lucro da tela de Produtos. Cada marketplace individual tem sua própria taxa, editável abaixo — essa é usada na Precificação.
            </p>
            <Button type="submit" disabled={salvandoConfig}>
              {salvandoConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </form>
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
                <TableHead className="text-right">Taxa (%)</TableHead>
                <TableHead>Status</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
