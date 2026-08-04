import type { Configuracao, FechamentoMensalProduto } from '@/types'
import type { LoteItemComLote } from '@/lib/custo-real'

// Média de vendas por dia calculada SÓ a partir do histórico real (fechamentos_mensais_produtos)
// — sem cair pra estimativa manual de "Vendas/mês". Enquanto não houver nenhum mês fechado
// pra esse produto, retorna null (sem dado suficiente ainda).
export function calcularMediaDiaria(fechamentosProduto: FechamentoMensalProduto[]): number | null {
  if (fechamentosProduto.length === 0) return null
  const totalVendas = fechamentosProduto.reduce((s, f) => s + f.vendas_qtd, 0)
  return totalVendas / fechamentosProduto.length / 30
}

export function calcularDiasEstoque(estoqueAtual: number, mediaDiaria: number | null): number | null {
  if (mediaDiaria == null || mediaDiaria <= 0) return null
  return estoqueAtual / mediaDiaria
}

// Quanto pedir no próximo lote pra cobrir o prazo de reposição (tempo até o pedido
// chegar) + a cobertura desejada depois que ele chegar, descontando o que já tem em estoque.
export function calcularSugestaoPedido(
  estoqueAtual: number,
  mediaDiaria: number | null,
  prazoReposicaoDias: number,
  coberturaDesejadaDias: number
): number | null {
  if (mediaDiaria == null) return null
  const sugestao = (prazoReposicaoDias + coberturaDesejadaDias) * mediaDiaria - estoqueAtual
  return Math.max(0, Math.round(sugestao))
}

export type NivelEstoque = 'critico' | 'atencao' | 'normal' | 'sem_dados'

// Mesmo limiar já usado na coluna "Dias de Estoque" de produtos/page.tsx (vermelho abaixo do
// prazo de reposição), só que agora com um degrau amarelo entre o prazo de reposição e a
// cobertura desejada, em vez de só vermelho/neutro.
export function calcularStatusEstoque(diasEstoque: number | null, config: Configuracao | null): NivelEstoque {
  if (diasEstoque == null || config == null) return 'sem_dados'
  if (diasEstoque < config.prazo_reposicao_dias) return 'critico'
  if (diasEstoque < config.prazo_reposicao_dias + config.estoque_cobertura_dias) return 'atencao'
  return 'normal'
}

// Data de compra mais recente entre os lotes que contêm esse produto (lote_itens -> lotes.data).
export function calcularUltimaCompra(loteItens: LoteItemComLote[], produtoId: string): string | null {
  const datas = loteItens.filter((i) => i.produto_id === produtoId).map((i) => i.lote.data)
  if (datas.length === 0) return null
  return datas.reduce((maisRecente, d) => (d > maisRecente ? d : maisRecente))
}

// Projeta a data em que o estoque cruza o prazo de reposição (quando precisa disparar uma
// nova compra pra não faltar) — hoje + (diasEstoque - prazoReposicaoDias) dias.
export function calcularProximaCompra(diasEstoque: number | null, config: Configuracao | null): 'comprar_agora' | string | null {
  if (diasEstoque == null || config == null) return null
  const diasAteComprar = diasEstoque - config.prazo_reposicao_dias
  if (diasAteComprar <= 0) return 'comprar_agora'
  const data = new Date()
  data.setDate(data.getDate() + Math.round(diasAteComprar))
  return data.toISOString().slice(0, 10)
}
