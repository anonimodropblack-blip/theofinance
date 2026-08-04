import type { Caixinha, CategoriaFinanceira, LancamentoFinanceiro } from '@/types'

export type LancamentoComCaixinha = LancamentoFinanceiro & {
  caixinha: Pick<Caixinha, 'nome'> | null
  categoria_financeira: CategoriaFinanceira | null
}

// Saldo é sempre derivado da soma dos lançamentos — nunca armazenado, mesmo padrão
// usado pro estoque (somado a partir de `movimentacoes`).
export function saldoPorConta(lancamentos: LancamentoFinanceiro[]) {
  const saldo = { operacional: 0, reserva: 0 }
  for (const l of lancamentos) {
    saldo[l.conta] += (l.tipo === 'entrada' ? 1 : -1) * l.valor
  }
  return saldo
}

export function totalRetiradoNoPeriodo(lancamentos: LancamentoFinanceiro[], inicioISO: string, fimISO: string): number {
  return lancamentos
    .filter((l) => l.retirada && l.tipo === 'saida' && l.data >= inicioISO && l.data <= fimISO)
    .reduce((s, l) => s + l.valor, 0)
}

export function primeiroDiaMesAtualISO(): string {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-01`
}

export function formatData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
