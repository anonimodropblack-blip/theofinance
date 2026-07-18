'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Loader2, Boxes } from 'lucide-react'
import type { Lote } from '@/types'

type LoteComTotal = Lote & { totalUnidades: number }

function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

export default function LotesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [lotes, setLotes] = useState<LoteComTotal[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lotes')
      .select('*, lote_itens(quantidade)')
      .order('data', { ascending: false })

    if (!error && data) {
      setLotes(
        data.map((l) => {
          const { lote_itens, ...lote } = l as Lote & { lote_itens: { quantidade: number }[] }
          return {
            ...lote,
            totalUnidades: lote_itens.reduce((soma, i) => soma + i.quantidade, 0),
          }
        })
      )
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Lotes</h1>
        <Button
          render={
            <Link href="/dashboard/lotes/novo">
              <Plus className="h-4 w-4" />
              Novo Lote
            </Link>
          }
        />
      </div>

      <div className="rounded-lg border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Boxes className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhum lote cadastrado ainda.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.codigo}</TableCell>
                  <TableCell className="text-muted-foreground">{l.fornecedor}</TableCell>
                  <TableCell className="text-muted-foreground">{formatData(l.data)}</TableCell>
                  <TableCell className="text-right">{l.totalUnidades}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/dashboard/lotes/${l.id}/custos`}>Custos</Link>}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
