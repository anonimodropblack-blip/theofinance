// Padrão de cores do app (pedido do Leandro): a cor vermelho/amarelo/verde é só pra lucro e
// margem (as coisas que dizem se o produto é bom ou ruim). Preço de venda/faturamento fica azul.
// Linhas de custo isoladas (imposto, comissão, logística, preço de custo) ficam neutras —
// só o resultado final (lucro/margem) é que precisa saltar aos olhos.

export const COR_FATURAMENTO = 'text-blue-600 dark:text-blue-400'
export const COR_POSITIVO = 'text-emerald-600 dark:text-emerald-400'
export const COR_ALERTA = 'text-amber-600 dark:text-amber-500'
export const COR_NEGATIVO = 'text-destructive'

// margemPct, margemMinimaPct e margemMaximaPct na mesma escala (0-100). Vermelho é só
// prejuízo real (número negativo) — margem positiva mas fora da faixa saudável (abaixo do
// mínimo ou acima do máximo configurado) fica amarela, não vermelha. margemMaximaPct é
// opcional: sem teto configurado, margem alta não gera alerta.
// Usar essa mesma cor tanto na Margem % quanto no Lucro daquele produto/contexto — os dois
// andam juntos.
export function corMargem(margemPct: number | null, margemMinimaPct: number, margemMaximaPct?: number | null): string {
  if (margemPct == null) return ''
  if (margemPct < 0) return COR_NEGATIVO
  if (margemPct < margemMinimaPct) return COR_ALERTA
  if (margemMaximaPct != null && margemPct > margemMaximaPct) return COR_ALERTA
  return COR_POSITIVO
}

// Pra totais agregados sem uma margem única associada (ex: soma de lucro de vários produtos):
// só positivo/negativo, sem faixa amarela.
export function corSinal(valor: number | null): string {
  if (valor == null) return ''
  return valor < 0 ? COR_NEGATIVO : COR_POSITIVO
}
