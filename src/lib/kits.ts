import type { CustoRealProduto } from '@/lib/custo-real'
import type { KitComponente } from '@/types'

// Custo do kit = soma do custo real (ou estimado) de cada componente vezes a
// quantidade dele no kit. Se algum componente ainda não tem custo conhecido
// (sem lote e sem preço/und. cadastrado), o kit também não tem — mesma regra
// dos produtos normais (usandoCustoReal decide entre custo real e estimado).
export function custoRealKit(
  componentes: KitComponente[],
  custoUnitarioPorProduto: Record<string, number | null>
): CustoRealProduto | null {
  if (componentes.length === 0) return null
  let custoUnitario = 0
  for (const c of componentes) {
    const custo = custoUnitarioPorProduto[c.componente_id]
    if (custo == null) return null
    custoUnitario += custo * c.quantidade
  }
  return { custoUnitario, custosLogistica: [] }
}

// Peso do kit = soma do peso de cada componente vezes a quantidade — usado
// pra tarifa de logística por peso (FBA/Full) igual um produto normal.
export function pesoGramasKit(
  componentes: KitComponente[],
  pesoPorProduto: Record<string, number | null>
): number | null {
  if (componentes.length === 0) return null
  let soma = 0
  for (const c of componentes) {
    const peso = pesoPorProduto[c.componente_id]
    if (peso == null) return null
    soma += peso * c.quantidade
  }
  return soma
}

// Quantos kits dá pra montar agora com o estoque atual dos componentes —
// limitado pelo componente mais escasso (ex: 5 unid. de A e 2 kits pedem 2x A
// cada = só dá pra montar 2 kits, mesmo sobrando A).
export function estoqueDisponivelKit(
  componentes: KitComponente[],
  estoqueTotalPorProduto: Record<string, number | undefined>
): number {
  if (componentes.length === 0) return 0
  return Math.min(
    ...componentes.map((c) => Math.floor((estoqueTotalPorProduto[c.componente_id] ?? 0) / c.quantidade))
  )
}

// Resumo legível do que compõe o kit, ex: "2x Vitamina D3 + K2, 1x Vitamina B12"
// — usado como texto auxiliar (não substitui a lista estruturada de componentes).
export function resumoKit(
  componentes: KitComponente[],
  nomePorProduto: Record<string, string | undefined>
): string {
  return componentes
    .map((c) => `${c.quantidade}x ${nomePorProduto[c.componente_id] ?? '?'}`)
    .join(', ')
}
