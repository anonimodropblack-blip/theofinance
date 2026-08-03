import { Badge } from '@/components/ui/badge'
import { formatData, formatCurrency, type PedidoCompleto } from '@/lib/pedidos'

type Props = {
  pedido: PedidoCompleto
}

export function PedidoItem({ pedido: p }: Props) {
  return (
    <div className="px-4 py-3 text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground shrink-0 w-10">{formatData(p.data)}</span>
        <Badge variant="outline" className="shrink-0">{p.local?.nome}</Badge>
        <span className="font-medium truncate">{p.produto?.nome}</span>
        <span className="text-xs text-muted-foreground shrink-0">{p.quantidade} un. × {formatCurrency(p.preco_unitario)}</span>
      </div>
      <span className="font-semibold shrink-0">{formatCurrency(p.quantidade * p.preco_unitario)}</span>
    </div>
  )
}
