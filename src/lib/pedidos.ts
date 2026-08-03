import type { LocalEstoque, Pedido, Produto } from '@/types'

export type PedidoCompleto = Pedido & {
  produto: Produto
  local: LocalEstoque
}

export function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

export function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
