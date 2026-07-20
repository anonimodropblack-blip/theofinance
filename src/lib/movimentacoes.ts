import type { LocalEstoque, Movimentacao, Produto } from '@/types'

export type MovimentacaoCompleta = Movimentacao & {
  produto: Produto
  origem: LocalEstoque | null
  destino: LocalEstoque | null
}

export const TIPO_LABEL: Record<string, string> = {
  entrada_lote: 'Entrada de Lote',
  envio: 'Envio',
  ajuste: 'Ajuste Manual',
}

export function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

export function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
