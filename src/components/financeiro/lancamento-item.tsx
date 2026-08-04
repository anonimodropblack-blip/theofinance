import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { CategoriaBadge } from '@/components/financeiro/categoria-badge'
import { formatCurrency, formatData, type LancamentoComCaixinha } from '@/lib/financeiro'

type Props = {
  lancamento: LancamentoComCaixinha
  onEdit: () => void
  onDelete: () => void
}

const CONTA_LABEL = { operacional: 'Operacional', reserva: 'Reserva/CDB' }

export function LancamentoItem({ lancamento: l, onEdit, onDelete }: Props) {
  const categoria = l.categoria_financeira
  return (
    <div className="px-4 py-3 text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {categoria && <CategoriaBadge icone={categoria.icone} cor={categoria.cor} />}
        <span className="text-muted-foreground shrink-0 w-20">{formatData(l.data)}</span>
        <Badge variant="outline" className="shrink-0">{CONTA_LABEL[l.conta]}</Badge>
        {l.retirada && <Badge className="shrink-0">Retirada</Badge>}
        {l.caixinha && <Badge variant="secondary" className="shrink-0">{l.caixinha.nome}</Badge>}
        <span className="truncate min-w-0">
          <span className="font-medium">{categoria?.nome ?? l.categoria ?? 'Sem categoria'}</span>
          {l.descricao && <span className="text-muted-foreground"> · {l.descricao}</span>}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`font-semibold ${l.tipo === 'entrada' ? 'text-success' : 'text-destructive'}`}>
          {l.tipo === 'entrada' ? '+' : '-'}{formatCurrency(l.valor)}
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
