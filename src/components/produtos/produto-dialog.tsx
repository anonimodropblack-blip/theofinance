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
import type { Produto, TipoProduto } from '@/types'

const TIPOS_PRODUTO: TipoProduto[] = ['Cápsula', 'Pó', 'Mastigável', 'Líquido', 'Chá', 'Softgel']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: Produto | null
  onSaved: () => void
}

export function ProdutoDialog({ open, onOpenChange, produto, onSaved }: Props) {
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [sku, setSku] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [formula, setFormula] = useState('')
  const [tipo, setTipo] = useState<TipoProduto | ''>('')
  const [qtdMinima, setQtdMinima] = useState('')
  const [precoCustoUnitario, setPrecoCustoUnitario] = useState('')
  const [vendasMes, setVendasMes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNome(produto?.nome ?? '')
    setFabricante(produto?.fabricante ?? '')
    setSku(produto?.sku ?? '')
    setPrecoVenda(produto?.preco_venda != null ? String(produto.preco_venda) : '')
    setStatus(produto?.status ?? 'ativo')
    setFormula(produto?.formula ?? '')
    setTipo(produto?.tipo ?? '')
    setQtdMinima(produto?.qtd_minima != null ? String(produto.qtd_minima) : '')
    setPrecoCustoUnitario(produto?.preco_custo_unitario != null ? String(produto.preco_custo_unitario) : '')
    setVendasMes(produto?.vendas_mes != null ? String(produto.vendas_mes) : '')
  }, [open, produto])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      nome: nome.trim(),
      fabricante: fabricante.trim() || null,
      sku: sku.trim() || null,
      preco_venda: precoVenda ? Number(precoVenda.replace(',', '.')) : null,
      status,
      formula: formula.trim() || null,
      tipo: tipo || null,
      qtd_minima: qtdMinima ? Number(qtdMinima) : null,
      preco_custo_unitario: precoCustoUnitario ? Number(precoCustoUnitario.replace(',', '.')) : null,
      vendas_mes: vendasMes ? Number(vendasMes) : null,
    }

    const { error } = produto
      ? await supabase.from('produtos').update(payload).eq('id', produto.id)
      : await supabase.from('produtos').insert(payload)

    setSaving(false)

    if (error) {
      toast.error('Erro ao salvar produto.')
      return
    }

    toast.success(produto ? 'Produto atualizado' : 'Produto criado')
    onOpenChange(false)
    onSaved()
  }

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fabricante">Fabricante</Label>
              <Input id="fabricante" value={fabricante} onChange={(e) => setFabricante(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="preco_venda">Preço de venda (R$)</Label>
              <Input
                id="preco_venda"
                inputMode="decimal"
                placeholder="0,00"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="formula">Fórmula</Label>
              <Input id="formula" value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="Ex: Beta-alanina 3.2g" />
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

          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="vendas_mes">Vendas/mês (marketplaces)</Label>
              <Input id="vendas_mes" inputMode="numeric" placeholder="0" value={vendasMes} onChange={(e) => setVendasMes(e.target.value)} />
            </div>
          </div>

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
