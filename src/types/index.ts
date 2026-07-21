// Tipos do domínio ERP Elysiar — preenchido junto com cada fase (produtos, lotes, estoque...)

export type TipoProduto = 'Cápsula' | 'Pó' | 'Mastigável' | 'Líquido' | 'Chá' | 'Softgel'
export type UnidadeEmbalagem = 'cápsulas' | 'ml' | 'gotas' | 'porções' | 'softgel'

export interface Produto {
  id: string
  nome: string
  fabricante: string | null
  sku: string | null
  preco_venda: number | null
  status: 'ativo' | 'inativo'
  composicao: string | null
  quantidade_embalagem: number | null
  unidade_embalagem: UnidadeEmbalagem | null
  tipo: TipoProduto | null
  qtd_minima: number | null
  preco_custo_unitario: number | null
  vendas_mes: number | null
  peso_gramas: number | null
  ads_modo: 'percentual' | 'valor' | null
  ads_valor: number | null
  created_at: string
  updated_at: string
}

export interface Fabricante {
  id: string
  nome: string
  telefone: string | null
  whatsapp: string | null
  email: string | null
  site: string | null
  endereco: string | null
  contato_responsavel: string | null
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
  usa_tarifa_fba: boolean
  fba_logistica_ativa: boolean
  usa_taxa_por_faixa: boolean
}

export interface FaixaLogisticaFba {
  id: string
  peso_min: number
  peso_max: number | null
  preco_min: number
  preco_max: number | null
  valor_fixo: number
  created_at: string
}

export interface FaixaTaxaMarketplacePreco {
  id: string
  local_id: string
  preco_min: number
  preco_max: number | null
  taxa_percentual: number
  valor_fixo: number
  created_at: string
}

export interface Lote {
  id: string
  codigo: string
  fornecedor: string
  data: string
  ativo: boolean
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
  custo_fixo_mensal: number
  gasto_ads_mensal: number
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
  quantidade_caixas: number | null
  codigo_referencia: string | null
  motorista: string | null
  custo_frete: number | null
  data: string
  created_at: string
}
