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

export interface LocalEstoque {
  id: string
  nome: string
  tipo: 'proprio' | 'marketplace'
  taxa_marketplace: number | null
  ativo: boolean
  ordem: number
}

export interface Lote {
  id: string
  codigo: string
  fornecedor: string
  data: string
  created_at: string
}

export interface LoteItem {
  id: string
  lote_id: string
  produto_id: string
  quantidade: number
  custo_unitario: number | null
}

export interface CategoriaCusto {
  id: string
  nome: string
  ativo: boolean
  padrao: boolean
  created_at: string
}

export interface LoteCusto {
  id: string
  lote_id: string
  categoria_id: string
  modo: 'total' | 'por_unidade'
  valor: number
  descricao: string | null
  created_at: string
}

export interface Configuracao {
  id: string
  imposto_percentual: number
  margem_minima_percentual: number
  updated_at: string
}

export interface Estoque {
  id: string
  produto_id: string
  local_id: string
  quantidade: number
}

export interface Movimentacao {
  id: string
  produto_id: string
  tipo: 'entrada_lote' | 'envio' | 'ajuste'
  quantidade: number
  origem_local_id: string | null
  destino_local_id: string | null
  lote_id: string | null
  observacao: string | null
  data: string
  created_at: string
}
