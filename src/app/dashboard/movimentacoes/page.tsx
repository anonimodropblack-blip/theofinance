'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, ArrowRight, Tags } from 'lucide-react'
import { NovaMovimentacaoDialog } from '@/components/movimentacoes/nova-movimentacao-dialog'
import type { LocalEstoque, Movimentacao, Produto } from '@/types'

type MovimentacaoCompleta = Movimentacao & {
  produto: Produto
  origem: LocalEstoque | null
  destino: LocalEstoque | null
}

const TIPO_LABEL: Record<string, string> = {
  entrada_lote: 'Entrada de Lote',
  envio: 'Envio',
  ajuste: 'Ajuste Manual',
}

function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

export default function MovimentacoesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCompleta[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [locais, setLocais] = useState<LocalEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: movs }, { data: prods }, { data: locs }] = await Promise.all([
      supabase
        .from('movimentacoes')
        .select('*, produto:produtos(*), origem:origem_local_id(id, nome), destino:destino_local_id(id, nome)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('produtos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('locais_estoque').select('*').eq('ativo', true).order('ordem'),
    ])
    setMovimentacoes((movs ?? []) as unknown as MovimentacaoCompleta[])
    setProdutos((prods ?? []) as Produto[])
    setLocais((locs ?? []) as LocalEstoque[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Movimentações</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Tags className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma movimentação registrada ainda.</p>
          </div>
        ) : (
          movimentacoes.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground shrink-0 w-10">{formatData(m.data)}</span>
                <Badge variant="outline" className="shrink-0">{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                <span className="font-medium truncate">{m.produto?.nome}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {m.tipo === 'envio' ? (
                    <>{m.origem?.nome} <ArrowRight className="h-3 w-3" /> {m.destino?.nome}</>
                  ) : (
                    (m.origem?.nome ?? m.destino?.nome)
                  )}
                </span>
                <span className={`font-semibold ${m.quantidade < 0 ? 'text-destructive' : 'text-success'}`}>
                  {m.quantidade > 0 ? '+' : ''}{m.quantidade}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <NovaMovimentacaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produtos={produtos}
        locais={locais}
        onSaved={carregar}
      />
    </div>
  )
}
