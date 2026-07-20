import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { TIPO_LABEL, formatData, formatCurrency, type MovimentacaoCompleta } from '@/lib/movimentacoes'

type Props = {
  movimentacao: MovimentacaoCompleta
  mostrarProduto?: boolean
}

export function MovimentacaoItem({ movimentacao: m, mostrarProduto = true }: Props) {
  const temDetalhesEnvio = m.tipo === 'envio' && (m.quantidade_caixas != null || m.codigo_referencia || m.motorista || m.custo_frete != null)

  return (
    <div className="px-4 py-3 text-sm space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-muted-foreground shrink-0 w-10">{formatData(m.data)}</span>
          <Badge variant="outline" className="shrink-0">{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
          {mostrarProduto && <span className="font-medium truncate">{m.produto?.nome}</span>}
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
      {temDetalhesEnvio && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[3.25rem] text-xs text-muted-foreground">
          {m.quantidade_caixas != null && <span>{m.quantidade_caixas} caixa{m.quantidade_caixas === 1 ? '' : 's'}</span>}
          {m.codigo_referencia && <span>Cód: {m.codigo_referencia}</span>}
          {m.motorista && <span>Motorista: {m.motorista}</span>}
          {m.custo_frete != null && <span>Frete: {formatCurrency(m.custo_frete)}</span>}
        </div>
      )}
    </div>
  )
}
