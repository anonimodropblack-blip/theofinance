'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Search, Warehouse } from 'lucide-react'
import type { LocalEstoque, Produto } from '@/types'

export default function EstoquePage() {
  const supabase = useMemo(() => createClient(), [])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [mapa, setMapa] = useState<Record<string, Record<string, number>>>({})
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [{ data: prods }, { data: locs }, { data: estoque }] = await Promise.all([
        supabase.from('produtos').select('*').order('nome'),
        supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
        supabase.from('estoque').select('produto_id, local_id, quantidade'),
      ])

      setProdutos((prods ?? []) as Produto[])
      setLocais((locs ?? []) as LocalEstoque[])

      const m: Record<string, Record<string, number>> = {}
      for (const e of estoque ?? []) {
        if (!m[e.produto_id]) m[e.produto_id] = {}
        m[e.produto_id][e.local_id] = e.quantidade
      }
      setMapa(m)
      setLoading(false)
    }
    carregar()
  }, [supabase])

  const filtrados = produtos.filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()))

  function totalProduto(produtoId: string) {
    const linha = mapa[produtoId] ?? {}
    return Object.values(linha).reduce((s, q) => s + q, 0)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Warehouse className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                {locais.map((l) => (
                  <TableHead key={l.id} className="text-right whitespace-nowrap">{l.nome}</TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  {locais.map((l) => (
                    <TableCell key={l.id} className="text-right text-muted-foreground">
                      {mapa[p.id]?.[l.id] ?? 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{totalProduto(p.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
