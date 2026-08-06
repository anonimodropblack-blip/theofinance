'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { FabricanteInput } from './fabricante-input'
import { MaisOpcoes } from '@/components/ui/mais-opcoes'
import type { Fabricante, LocalEstoque, Produto, TipoProduto, UnidadeEmbalagem } from '@/types'

const TIPOS_PRODUTO: TipoProduto[] = ['Cápsula', 'Pó', 'Mastigável', 'Líquido', 'Chá', 'Softgel']
const UNIDADES_EMBALAGEM: UnidadeEmbalagem[] = ['cápsulas', 'ml', 'gotas', 'porções', 'softgel']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: Produto | null
  locaisMarketplace: LocalEstoque[]
  vendasCanalProduto: Record<string, number>
  onSaved: () => void
}

export function ProdutoDialog({ open, onOpenChange, produto, locaisMarketplace, vendasCanalProduto, onSaved }: Props) {
  const [supabase] = useState(() => createClient())
  const [nome, setNome] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([])
  const [sku, setSku] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [composicao, setComposicao] = useState('')
  const [quantidadeEmbalagem, setQuantidadeEmbalagem] = useState('')
  const [unidadeEmbalagem, setUnidadeEmbalagem] = useState<UnidadeEmbalagem | ''>('')
  const [tipo, setTipo] = useState<TipoProduto | ''>('')
  const [qtdMinima, setQtdMinima] = useState('')
  const [precoCustoUnitario, setPrecoCustoUnitario] = useState('')
  const [vendasPorCanal, setVendasPorCanal] = useState<Record<string, string>>({})
  const [pesoGramas, setPesoGramas] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    supabase.from('fabricantes').select('*').order('nome').then(({ data }) => setFabricantes((data ?? []) as Fabricante[]))
    setNome(produto?.nome ?? '')
    setFabricante(produto?.fabricante ?? '')
    setSku(produto?.sku ?? '')
    setPrecoVenda(produto?.preco_venda != null ? String(produto.preco_venda) : '')
    setStatus(produto?.status ?? 'ativo')
    setComposicao(produto?.composicao ?? '')
    setQuantidadeEmbalagem(produto?.quantidade_embalagem != null ? String(produto.quantidade_embalagem) : '')
    setUnidadeEmbalagem(produto?.unidade_embalagem ?? '')
    setTipo(produto?.tipo ?? '')
    setQtdMinima(produto?.qtd_minima != null ? String(produto.qtd_minima) : '')
    setPrecoCustoUnitario(produto?.preco_custo_unitario != null ? String(produto.preco_custo_unitario) : '')
    setVendasPorCanal(
      Object.fromEntries(locaisMarketplace.map((l) => [l.id, String(vendasCanalProduto[l.id] ?? '')]))
    )
    setPesoGramas(produto?.peso_gramas != null ? String(produto.peso_gramas) : '')
  }, [open, produto, locaisMarketplace, vendasCanalProduto, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const fabricanteNome = fabricante.trim()
    const jaExiste = fabricanteNome && fabricantes.some((f) => f.nome.toLowerCase() === fabricanteNome.toLowerCase())
    if (fabricanteNome && !jaExiste) {
      await supabase.from('fabricantes').insert({ nome: fabricanteNome })
    }

    const payload = {
      nome: nome.trim(),
      fabricante: fabricanteNome || null,
      sku: sku.trim() || null,
      preco_venda: precoVenda ? Number(precoVenda.replace(',', '.')) : null,
      status,
      composicao: composicao.trim() || null,
      quantidade_embalagem: quantidadeEmbalagem ? Number(quantidadeEmbalagem) : null,
      unidade_embalagem: unidadeEmbalagem || null,
      tipo: tipo || null,
      qtd_minima: qtdMinima ? Number(qtdMinima) : null,
      preco_custo_unitario: precoCustoUnitario ? Number(precoCustoUnitario.replace(',', '.')) : null,
      peso_gramas: pesoGramas ? Number(pesoGramas) : null,
    }

    const { data: salvo, error } = produto
      ? await supabase.from('produtos').update(payload).eq('id', produto.id).select('id').single()
      : await supabase.from('produtos').insert(payload).select('id').single()

    if (error || !salvo) {
      setSaving(false)
      toast.error('Erro ao salvar produto.')
      return
    }

    await supabase.from('vendas_mes_canal').delete().eq('produto_id', salvo.id)
    const linhasVendas = Object.entries(vendasPorCanal)
      .map(([localId, v]) => ({ produto_id: salvo.id, local_id: localId, quantidade: Number(v) || 0 }))
      .filter((l) => l.quantidade > 0)
    if (linhasVendas.length > 0) {
      await supabase.from('vendas_mes_canal').insert(linhasVendas)
    }

    setSaving(false)
    toast.success(produto ? 'Produto atualizado' : 'Produto criado')
    onOpenChange(false)
    onSaved()
  }

  const temOpcoesPreenchidas = Boolean(
    produto?.sku ||
      produto?.composicao ||
      produto?.quantidade_embalagem != null ||
      produto?.unidade_embalagem ||
      produto?.tipo ||
      produto?.qtd_minima != null ||
      produto?.preco_custo_unitario != null ||
      produto?.peso_gramas != null ||
      Object.values(vendasCanalProduto).some((v) => v > 0)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fabricante">Fabricante</Label>
            <FabricanteInput value={fabricante} onChange={setFabricante} fabricantes={fabricantes} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="preco_venda">Preço de venda padrão (R$)</Label>
              <Input
                id="preco_venda"
                inputMode="decimal"
                placeholder="0,00"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Usado em todo canal, a não ser que você defina um preço específico pra ele em Produtos ou Precificação.</p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'ativo' | 'inativo')}
                items={{ ativo: 'Ativo', inativo: 'Inativo' }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <MaisOpcoes defaultOpen={temOpcoesPreenchidas}>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="composicao">Composição / Dosagem</Label>
              <Input id="composicao" value={composicao} onChange={(e) => setComposicao(e.target.value)} placeholder="Ex: Coenzima Q10 200mg" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantidade_embalagem">Quantidade</Label>
                <Input id="quantidade_embalagem" inputMode="numeric" placeholder="60" value={quantidadeEmbalagem} onChange={(e) => setQuantidadeEmbalagem(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={unidadeEmbalagem}
                  onValueChange={(v) => setUnidadeEmbalagem((v as UnidadeEmbalagem) ?? '')}
                  items={Object.fromEntries(UNIDADES_EMBALAGEM.map((u) => [u, u]))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_EMBALAGEM.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo((v as TipoProduto) ?? '')}
                  items={Object.fromEntries(TIPOS_PRODUTO.map((t) => [t, t]))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PRODUTO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="qtd_minima">Qtd. mínima (fábrica)</Label>
                <Input id="qtd_minima" inputMode="numeric" placeholder="0" value={qtdMinima} onChange={(e) => setQtdMinima(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco_custo_unitario">Preço por und. (R$)</Label>
                <Input
                  id="preco_custo_unitario"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={precoCustoUnitario}
                  onChange={(e) => setPrecoCustoUnitario(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vendas/mês por canal</Label>
              <p className="text-xs text-muted-foreground">Estimativa manual — se você já lança pedidos em Pedidos, isso é atualizado sozinho.</p>
              {locaisMarketplace.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum marketplace ativo cadastrado ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {locaisMarketplace.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{l.nome}</span>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        className="w-24 text-right"
                        value={vendasPorCanal[l.id] ?? ''}
                        onChange={(e) => setVendasPorCanal((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso_gramas">Peso (gramas)</Label>
              <Input id="peso_gramas" inputMode="numeric" placeholder="0" className="max-w-[140px]" value={pesoGramas} onChange={(e) => setPesoGramas(e.target.value)} />
              <p className="text-xs text-muted-foreground">Usado pra calcular a tarifa de logística da Amazon FBA na Precificação.</p>
            </div>
          </MaisOpcoes>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
