'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, History } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { FechamentoMensal, FechamentoMensalCanal, FechamentoMensalProduto } from '@/types'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMes(iso: string) {
  const [ano, mes] = iso.split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`
}

type Metrica = 'vendas' | 'faturamento' | 'lucro'

const METRICA_LABEL: Record<Metrica, string> = { vendas: 'Vendas', faturamento: 'Faturamento', lucro: 'Lucro' }

function formatValor(metrica: Metrica, v: number) {
  return metrica === 'vendas' ? String(v) : formatCurrency(v)
}

export default function HistoricoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [fechamentos, setFechamentos] = useState<FechamentoMensal[]>([])
  const [fechamentosProdutos, setFechamentosProdutos] = useState<FechamentoMensalProduto[]>([])
  const [fechamentosCanais, setFechamentosCanais] = useState<FechamentoMensalCanal[]>([])
  const [loading, setLoading] = useState(true)
  const [metrica, setMetrica] = useState<Metrica>('faturamento')

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: fs }, { data: fps }, { data: fcs }] = await Promise.all([
      supabase.from('fechamentos_mensais').select('*').order('mes_referencia'),
      supabase.from('fechamentos_mensais_produtos').select('*'),
      supabase.from('fechamentos_mensais_canais').select('*'),
    ])
    setFechamentos((fs ?? []) as FechamentoMensal[])
    setFechamentosProdutos((fps ?? []) as FechamentoMensalProduto[])
    setFechamentosCanais((fcs ?? []) as FechamentoMensalCanal[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const meses = useMemo(() => fechamentos.map((f) => f.mes_referencia), [fechamentos])

  const dadosGrafico = useMemo(() => fechamentos.map((f) => ({
    mes: formatMes(f.mes_referencia),
    Faturamento: f.faturamento_bruto,
    Lucro: f.lucro_liquido,
  })), [fechamentos])

  const pivotProdutos = useMemo(() => {
    const nomesPorId = new Map<string, string>()
    const valoresPorProdutoEMes = new Map<string, Map<string, number>>()
    for (const fp of fechamentosProdutos) {
      const fechamento = fechamentos.find((f) => f.id === fp.fechamento_id)
      if (!fechamento) continue
      nomesPorId.set(fp.produto_id, fp.produto_nome)
      const valorMetrica = metrica === 'vendas' ? fp.vendas_qtd : metrica === 'faturamento' ? fp.faturamento : fp.lucro
      const linha = valoresPorProdutoEMes.get(fp.produto_id) ?? new Map<string, number>()
      linha.set(fechamento.mes_referencia, valorMetrica)
      valoresPorProdutoEMes.set(fp.produto_id, linha)
    }
    return [...nomesPorId.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([produtoId, nome]) => ({ id: produtoId, nome, valores: valoresPorProdutoEMes.get(produtoId) ?? new Map() }))
  }, [fechamentosProdutos, fechamentos, metrica])

  const pivotCanais = useMemo(() => {
    const nomesPorId = new Map<string, string>()
    const valoresPorCanalEMes = new Map<string, Map<string, number>>()
    for (const fc of fechamentosCanais) {
      const fechamento = fechamentos.find((f) => f.id === fc.fechamento_id)
      if (!fechamento) continue
      nomesPorId.set(fc.local_id, fc.local_nome)
      const valorMetrica = metrica === 'vendas' ? fc.vendas_qtd : metrica === 'faturamento' ? fc.faturamento : fc.lucro
      const linha = valoresPorCanalEMes.get(fc.local_id) ?? new Map<string, number>()
      linha.set(fechamento.mes_referencia, valorMetrica)
      valoresPorCanalEMes.set(fc.local_id, linha)
    }
    return [...nomesPorId.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([localId, nome]) => ({ id: localId, nome, valores: valoresPorCanalEMes.get(localId) ?? new Map() }))
  }, [fechamentosCanais, fechamentos, metrica])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fechamentos.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground rounded-lg border border-border">
          <History className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm">Feche o mês pelo menos uma vez no Dashboard pra ver o histórico aqui.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Faturamento e Lucro por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dadosGrafico} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} width={90} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => formatCurrency(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Faturamento" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Lucro" stroke="var(--success)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs value={metrica} onValueChange={(v) => setMetrica((v ?? 'faturamento') as Metrica)}>
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="lucro">Lucro</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{METRICA_LABEL[metrica]} por Produto</h2>
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Produto</TableHead>
                {meses.map((m) => (
                  <TableHead key={m} className="text-right whitespace-nowrap">{formatMes(m)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotProdutos.map((linha) => (
                <TableRow key={linha.id}>
                  <TableCell className="font-medium sticky left-0 bg-background">{linha.nome}</TableCell>
                  {meses.map((m) => (
                    <TableCell key={m} className="text-right text-muted-foreground whitespace-nowrap">
                      {linha.valores.has(m) ? formatValor(metrica, linha.valores.get(m)!) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{METRICA_LABEL[metrica]} por Canal</h2>
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Canal</TableHead>
                {meses.map((m) => (
                  <TableHead key={m} className="text-right whitespace-nowrap">{formatMes(m)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotCanais.map((linha) => (
                <TableRow key={linha.id}>
                  <TableCell className="font-medium sticky left-0 bg-background">{linha.nome}</TableCell>
                  {meses.map((m) => (
                    <TableCell key={m} className="text-right text-muted-foreground whitespace-nowrap">
                      {linha.valores.has(m) ? formatValor(metrica, linha.valores.get(m)!) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
