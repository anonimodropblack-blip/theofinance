import type { Caixinha } from '@/types'

// Regra de pró-labore: até o alvo, recebe o lucro cheio (garante o padrão de vida
// combinado); acima do alvo, trava no alvo + uma % pequena do excedente — recompensa
// o crescimento sem esvaziar o caixa da empresa. O piso é só referência/alerta (ver
// dashboard), não entra nessa conta.
export function calcularProlabore(lucroBase: number, alvo: number, pctExcedente: number): number {
  if (lucroBase <= 0) return 0
  if (lucroBase <= alvo) return lucroBase
  return alvo + (lucroBase - alvo) * (pctExcedente / 100)
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
