'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CalendarClock, CircleCheck, HelpCircle, PackageSearch, TriangleAlert } from 'lucide-react'
import type { NivelEstoque } from '@/lib/reposicao'
import type { LocalEstoque, Produto } from '@/types'

type Props = {
  produto: Produto
  total: number
  saldoPorLocal: Record<string, number>
  locais: LocalEstoque[]
  status: NivelEstoque
  diasEstoque: number | null
  ultimaCompra: string | null
  proximaCompra: 'comprar_agora' | string | null
  onClick: () => void
}

const STATUS: Record<NivelEstoque, { label: string; icon: typeof CircleCheck; className: string }> = {
  critico: { label: 'Comprar', icon: TriangleAlert, className: 'bg-destructive/10 text-destructive' },
  atencao: { label: 'Atenção', icon: TriangleAlert, className: 'bg-amber-500/10 text-amber-600 dark:text-amber-500' },
  normal: { label: 'Normal', icon: CircleCheck, className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  sem_dados: { label: 'Sem dados', icon: HelpCircle, className: 'bg-muted text-muted-foreground' },
}

function formatarData(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function EstoqueProdutoCard({ produto, total, saldoPorLocal, locais, status, diasEstoque, ultimaCompra, proximaCompra, onClick }: Props) {
  const statusInfo = STATUS[status]
  const StatusIcon = statusInfo.icon
  const locaisComEstoque = locais.filter((l) => (saldoPorLocal[l.id] ?? 0) > 0)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className="cursor-pointer transition-all hover:ring-foreground/15"
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {produto.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-snug truncate">{produto.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{produto.sku || 'sem SKU'}</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <span className="text-2xl font-semibold tracking-tight">{total}</span>
          <span className="ml-1.5 text-xs text-muted-foreground">unidades em estoque</span>
        </div>

        {locaisComEstoque.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {locaisComEstoque.map((l) => (
              <span key={l.id} className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                {l.nome} <span className="font-medium text-foreground">{saldoPorLocal[l.id]}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PackageSearch className="h-3.5 w-3.5" />
            Sem estoque alocado
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
          <div>
            <p className="text-muted-foreground">Cobertura</p>
            <p className="font-medium">{diasEstoque != null ? `${Math.round(diasEstoque)}d` : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Última compra</p>
            <p className="font-medium">{ultimaCompra ? formatarData(ultimaCompra) : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" />Próxima</p>
            <p className="font-medium">
              {proximaCompra === 'comprar_agora' ? (
                <span className="text-destructive">agora</span>
              ) : proximaCompra ? (
                formatarData(proximaCompra)
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
