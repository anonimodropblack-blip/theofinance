import type { Caixinha, ProlaboreFaixa } from '@/types'

// Pró-labore por faixa de saldo de caixa (não por lucro do mês): libera o valor
// da faixa mais alta cujo saldo_minimo o saldo ATUAL ainda cobre — a saúde do
// caixa da empresa vem antes do salário do dono, então se o saldo cair depois
// de já ter alcançado uma faixa maior, o valor sugerido cai junto (recalculado
// do zero a cada vez, nunca trava numa faixa antiga).
export function calcularProlaboreLiberado(saldoTotal: number, faixas: ProlaboreFaixa[]): number {
  const elegiveis = faixas.filter((f) => f.saldo_minimo <= saldoTotal)
  if (elegiveis.length === 0) return 0
  return elegiveis.reduce((maior, f) => (f.saldo_minimo > maior.saldo_minimo ? f : maior)).valor
}

export type AlocacaoCaixinha = { caixinha: Caixinha; valor: number }

// Divide o que sobrou do lucro (depois do pró-labore) proporcionalmente ao percentual
// de cada caixinha ativa. Não normaliza pra 100% — se a soma configurada não fechar
// 100, o total alocado fica menor/maior que o disponível (aviso fica só na tela de
// Configurações, é intencional).
export function calcularAlocacaoCaixinhas(valorDisponivel: number, caixinhas: Caixinha[]): AlocacaoCaixinha[] {
  const disponivel = Math.max(0, valorDisponivel)
  return caixinhas
    .filter((c) => c.ativo)
    .map((c) => ({ caixinha: c, valor: disponivel * (c.percentual / 100) }))
}
