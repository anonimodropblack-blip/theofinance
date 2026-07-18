// Tipos do domínio ERP Elysiar — preenchido junto com cada fase (produtos, lotes, estoque...)

export interface Produto {
  id: string
  nome: string
  fabricante: string | null
  sku: string | null
  preco_venda: number | null
  status: 'ativo' | 'inativo'
  created_at: string
  updated_at: string
}
