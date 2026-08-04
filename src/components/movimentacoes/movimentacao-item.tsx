import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { TIPO_LABEL, formatData, formatCurrency, type MovimentacaoCompleta } from '@/lib/movimentacoes'
import { ConfirmarRecebimentoDialog } from '@/components/movimentacoes/confirmar-recebimento-dialog'

type Props = {
  movimentacao: MovimentacaoCompleta
  mostrarProduto?: boolean
  onAtualizado?: () => void
}

export function MovimentacaoItem({ movimentacao: m, mostrarProduto = true, onAtualizado }: Props) {
  const [confirmarOpen, setConfirmarOpen] = useState(false)
  const temDetalhesEnvio = m.tipo === 'envio' && (m.quantidade_caixas != null || m.codigo_referencia || m.motorista || m.custo_frete != null)
  const qtdEnviada = Math.abs(m.quantidade)

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
      {m.tipo === 'envio' && (
        <div className="flex items-center gap-2 pl-[3.25rem]">
          {m.qtd_confirmada == null ? (
            <>
              <Badge variant="secondary" className="text-xs">Recebimento pendente</Badge>
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setConfirmarOpen(true)}>
                Confirmar
              </Button>
            </>
          ) : m.qtd_confirmada >= qtdEnviada ? (
            <Badge className="text-xs bg-success/15 text-success">Recebido</Badge>
          ) : (
            <>
              <Badge variant="destructive" className="text-xs">Com perda</Badge>
              <span className="text-xs text-muted-foreground">
                recebeu {m.qtd_confirmada} de {qtdEnviada}{m.motivo_diferenca ? ` · ${m.motivo_diferenca}` : ''}
              </span>
            </>
          )}
        </div>
      )}

      <ConfirmarRecebimentoDialog
        open={confirmarOpen}
        onOpenChange={setConfirmarOpen}
        movimentacao={m}
        onSaved={() => onAtualizado?.()}
      />
    </div>
  )
}
