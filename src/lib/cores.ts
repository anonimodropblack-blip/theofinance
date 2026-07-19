// Padrão de cores do app (pedido do Leandro): custos sempre em vermelho, lucro sempre em
// verde, faturamento/preço de venda sempre em azul, margem varia por faixa (verde/amarelo/vermelho).

export const COR_CUSTO = 'text-red-600 dark:text-red-400'
export const COR_LUCRO = 'text-emerald-600 dark:text-emerald-400'
export const COR_FATURAMENTO = 'text-blue-600 dark:text-blue-400'
export const COR_MARGEM_OK = 'text-emerald-600 dark:text-emerald-400'
export const COR_MARGEM_ALERTA = 'text-amber-600 dark:text-amber-500'
export const COR_MARGEM_BAIXA = 'text-destructive'

// margemPct e margemMinimaPct na mesma escala (0-100). Amarelo = até 5 pontos percentuais
// acima do mínimo configurado, faixa de "quase no limite".
export function corMargem(margemPct: number | null, margemMinimaPct: number, faixaAlertaPP = 5): string {
  if (margemPct == null) return ''
  if (margemPct < margemMinimaPct) return COR_MARGEM_BAIXA
  if (margemPct < margemMinimaPct + faixaAlertaPP) return COR_MARGEM_ALERTA
  return COR_MARGEM_OK
}
