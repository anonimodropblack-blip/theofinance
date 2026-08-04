'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { ProdutoDetalheSheet } from '@/components/estoque/produto-detalhe-sheet'
import { EstoqueProdutoCard } from '@/components/estoque/estoque-produto-card'
import { Loader2, Search, Warehouse } from 'lucide-react'
import { calcularDiasEstoque, calcularMediaDiaria, calcularProximaCompra, calcularStatusEstoque, calcularUltimaCompra, type NivelEstoque } from '@/lib/reposicao'
import type { LoteItemComLote } from '@/lib/custo-real'
import type { Configuracao, FechamentoMensalProduto, LocalEstoque, Produto } from '@/types'

const ORDEM_SEVERIDADE: Record<NivelEstoque, number> = { critico: 0, atencao: 1, normal: 2, sem_dados: 3 }

export default function EstoquePage() {
  const supabase = useMemo(() => createClient(), [])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [mapa, setMapa] = useState<Record<string, Record<string, number>>>({})
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [loteItens, setLoteItens] = useState<LoteItemComLote[]>([])
  const [fechamentosPorProduto, setFechamentosPorProduto] = useState<Record<string, FechamentoMensalProduto[]>>({})
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const carregar = useCallback(async () => {
    const [{ data: prods }, { data: locs }, { data: estoque }, { data: cfg }, { data: itens }, { data: fechamentosProdutosData }] = await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
      supabase.from('estoque').select('produto_id, local_id, quantidade'),
      supabase.from('configuracoes').select('*').single(),
      supabase.from('lote_itens').select('*, lote:lotes(*)'),
      supabase.from('fechamentos_mensais_produtos').select('*'),
    ])

    setProdutos((prods ?? []) as Produto[])
    setLocais((locs ?? []) as LocalEstoque[])

    const m: Record<string, Record<string, number>> = {}
    for (const e of estoque ?? []) {
      if (!m[e.produto_id]) m[e.produto_id] = {}
      m[e.produto_id][e.local_id] = e.quantidade
    }
    setMapa(m)
    setConfig(cfg as Configuracao)
    setLoteItens((itens ?? []) as LoteItemComLote[])

    const fechamentosAgrupados: Record<string, FechamentoMensalProduto[]> = {}
    for (const f of (fechamentosProdutosData ?? []) as FechamentoMensalProduto[]) {
      if (!fechamentosAgrupados[f.produto_id]) fechamentosAgrupados[f.produto_id] = []
      fechamentosAgrupados[f.produto_id].push(f)
    }
    setFechamentosPorProduto(fechamentosAgrupados)

    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function abrirDetalhe(produto: Produto) {
    setProdutoSelecionado(produto)
    setSheetOpen(true)
  }

  function totalProduto(produtoId: string) {
    const linha = mapa[produtoId] ?? {}
    return Object.values(linha).reduce((s, q) => s + q, 0)
  }

  const buscaLower = busca.toLowerCase()
  const filtrados = produtos
    .filter((p) => !busca || p.nome.toLowerCase().includes(buscaLower) || (p.sku ?? '').toLowerCase().includes(buscaLower))
    .map((p) => {
      const total = totalProduto(p.id)
      const mediaDiaria = calcularMediaDiaria(fechamentosPorProduto[p.id] ?? [])
      const diasEstoque = calcularDiasEstoque(total, mediaDiaria)
      return {
        produto: p,
        total,
        diasEstoque,
        status: calcularStatusEstoque(diasEstoque, config),
        ultimaCompra: calcularUltimaCompra(loteItens, p.id),
        proximaCompra: calcularProximaCompra(diasEstoque, config),
      }
    })
    .sort((a, b) => {
      const diff = ORDEM_SEVERIDADE[a.status] - ORDEM_SEVERIDADE[b.status]
      return diff !== 0 ? diff : a.produto.nome.localeCompare(b.produto.nome)
    })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto ou SKU..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border py-16 text-center text-muted-foreground">
          <Warehouse className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map(({ produto, total, diasEstoque, status, ultimaCompra, proximaCompra }) => (
            <EstoqueProdutoCard
              key={produto.id}
              produto={produto}
              total={total}
              saldoPorLocal={mapa[produto.id] ?? {}}
              locais={locais}
              status={status}
              diasEstoque={diasEstoque}
              ultimaCompra={ultimaCompra}
              proximaCompra={proximaCompra}
              onClick={() => abrirDetalhe(produto)}
            />
          ))}
        </div>
      )}

      <ProdutoDetalheSheet
        produto={produtoSelecionado}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locais={locais}
        produtos={produtos}
        saldoPorLocal={produtoSelecionado ? mapa[produtoSelecionado.id] ?? {} : {}}
        onMovimentacaoRegistrada={carregar}
      />
    </div>
  )
}
