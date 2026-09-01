import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { formatData, formatCurrency, type PedidoCompleto } from '@/lib/pedidos'
import type { Pedido } from '@/types'

type Props = {
  pedido: PedidoCompleto
  onAlterarStatus: (status: Pedido['status']) => void
  onExcluir: () => void
}

const STATUS_LABEL: Record<Pedido['status'], string> = {
  confirmado: 'Confirmado',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
}

export function PedidoItem({ pedido: p, onAlterarStatus, onExcluir }: Props) {
  const foiRevertido = p.status !== 'confirmado'
  return (
    <div className={`px-4 py-3 text-sm flex items-center justify-between gap-3 ${foiRevertido ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground shrink-0 w-10">{formatData(p.data)}</span>
        <Badge variant="outline" className="shrink-0">{p.local?.nome}</Badge>
        <span className={`font-medium truncate ${foiRevertido ? 'line-through' : ''}`}>{p.produto?.nome}</span>
        <span className="text-xs text-muted-foreground shrink-0">{p.quantidade} un. × {formatCurrency(p.preco_unitario)}</span>
        {p.gasto_ads != null && (
          <span className="text-xs text-muted-foreground shrink-0" title="Gasto real com Ads pra essa venda">Ads: {formatCurrency(p.gasto_ads)}</span>
        )}
        {foiRevertido && (
          <Badge variant={p.status === 'devolvido' ? 'secondary' : 'destructive'} className="shrink-0">
            {STATUS_LABEL[p.status]}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-semibold">{formatCurrency(p.quantidade * p.preco_unitario)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {p.status !== 'confirmado' && (
              <DropdownMenuItem onClick={() => onAlterarStatus('confirmado')}>Marcar como confirmado</DropdownMenuItem>
            )}
            {p.status !== 'devolvido' && (
              <DropdownMenuItem onClick={() => onAlterarStatus('devolvido')}>Marcar como devolvido</DropdownMenuItem>
            )}
            {p.status !== 'cancelado' && (
              <DropdownMenuItem onClick={() => onAlterarStatus('cancelado')}>Marcar como cancelado</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onExcluir} className="text-destructive">Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
