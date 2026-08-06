import type { ContaPagar } from '@/types'

export type StatusContaPagar = 'pago' | 'vencido' | 'vencendo' | 'parcial' | 'pendente'

// Quantos dias antes do vencimento já conta como "vencendo" (aparece em alerta).
export const DIAS_ALERTA_VENCIMENTO = 7

export const STATUS_LABEL: Record<StatusContaPagar, string> = {
  pago: 'Pago',
  vencido: 'Vencido',
  vencendo: 'Vencendo',
  parcial: 'Parcial',
  pendente: 'Pendente',
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

// Diferença em dias entre duas datas ISO (YYYY-MM-DD) — positivo se `dataISO` é
// depois de `baseISO`. Usa UTC pra não pegar erro de horário de verão/fuso.
export function diasEntre(dataISO: string, baseISO: string = hojeISO()): number {
  const [ay, am, ad] = baseISO.split('-').map(Number)
  const [by, bm, bd] = dataISO.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86400000)
}

export function somarDias(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split('-').map(Number)
  const data = new Date(Date.UTC(y, m - 1, d))
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

export function saldoDevedor(conta: ContaPagar): number {
  return Math.max(0, conta.valor_total - conta.valor_pago)
}

export function statusContaPagar(conta: ContaPagar, hoje: string = hojeISO()): StatusContaPagar {
  if (conta.valor_pago >= conta.valor_total) return 'pago'
  if (diasEntre(conta.data_vencimento, hoje) < 0) return 'vencido'
  if (diasEntre(conta.data_vencimento, hoje) <= DIAS_ALERTA_VENCIMENTO) return 'vencendo'
  return conta.valor_pago > 0 ? 'parcial' : 'pendente'
}

export function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDataCurta(iso: string) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}
