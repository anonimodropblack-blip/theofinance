'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { CategoriaCusto, Lote, LoteCusto } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CustosLotePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [lote, setLote] = useState<Lote | null>(null)
  const [totalUnidades, setTotalUnidades] = useState(0)
  const [categorias, setCategorias] = useState<CategoriaCusto[]>([])
  const [custos, setCustos] = useState<(LoteCusto & { categoria: CategoriaCusto })[]>([])
  const [loading, setLoading] = useState(true)

  const [categoriaId, setCategoriaId] = useState('')
  const [modo, setModo] = useState<'total' | 'por_unidade'>('total')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: loteData }, { data: itensData }, { data: catData }, { data: custosData }] = await Promise.all([
      supabase.from('lotes').select('*').eq('id', params.id).single(),
      supabase.from('lote_itens').select('quantidade').eq('lote_id', params.id),
      supabase.from('categorias_custo').select('*').eq('ativo', true).order('nome'),
      supabase.from('lote_custos').select('*, categoria:categorias_custo(*)').eq('lote_id', params.id).order('created_at'),
    ])

    setLote(loteData as Lote)
    setTotalUnidades((itensData ?? []).reduce((s, i) => s + i.quantidade, 0))
    setCategorias((catData ?? []) as CategoriaCusto[])
    setCustos((custosData ?? []) as (LoteCusto & { categoria: CategoriaCusto })[])
    setLoading(false)
  }, [supabase, params.id])

  useEffect(() => { carregar() }, [carregar])

  async function salvarCusto() {
    if (!categoriaId || !valor) {
      toast.error('Selecione a categoria e informe o valor.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('lote_custos').insert({
      lote_id: params.id,
      categoria_id: categoriaId,
      modo,
      valor: Number(valor.replace(',', '.')),
      descricao: descricao.trim() || null,
    })
    setSalvando(false)
    if (error) { toast.error('Erro ao salvar custo.'); return }

    setCategoriaId('')
    setModo('total')
    setValor('')
    setDescricao('')
    toast.success('Custo adicionado')
    carregar()
  }

  async function removerCusto(id: string) {
    await supabase.from('lote_custos').delete().eq('id', id)
    carregar()
  }

  // Resumo — converte tudo pra valor total (modo por_unidade * total de unidades do lote)
  const resumoPorCategoria = custos.reduce<Record<string, number>>((acc, c) => {
    const totalDoItem = c.modo === 'por_unidade' ? c.valor * totalUnidades : c.valor
    acc[c.categoria.nome] = (acc[c.categoria.nome] ?? 0) + totalDoItem
    return acc
  }, {})

  const totalCustos = Object.values(resumoPorCategoria).reduce((s, v) => s + v, 0)
  const custoPorUnidade = totalUnidades > 0 ? totalCustos / totalUnidades : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/dashboard/lotes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          Lotes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Custos do {lote?.codigo}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{lote?.fornecedor} · {totalUnidades} unidades</p>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={modo} onValueChange={(v) => setModo(v as 'total' | 'por_unidade')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Valor total</SelectItem>
                <SelectItem value="por_unidade">Valor por unidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição (opcional)</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <Button onClick={salvarCusto} disabled={salvando} className="w-full">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
        </Button>
      </div>

      {custos.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Custos lançados</p>
          {custos.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm py-1">
              <div>
                <span>{c.categoria.nome}</span>
                {c.descricao && <span className="text-muted-foreground"> · {c.descricao}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {formatCurrency(c.valor)}{c.modo === 'por_unidade' ? '/un' : ''}
                </span>
                <button type="button" onClick={() => removerCusto(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Resumo</p>
        {Object.entries(resumoPorCategoria).map(([nome, v]) => (
          <div key={nome} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{nome}</span>
            <span>{formatCurrency(v)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm font-medium pt-2 mt-2 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(totalCustos)}</span>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-primary">
          <span>Custo por unidade</span>
          <span>{formatCurrency(custoPorUnidade)}</span>
        </div>
      </div>
    </div>
  )
}
