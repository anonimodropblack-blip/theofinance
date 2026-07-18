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
import type { Produto } from '@/types'

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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNome(produto?.nome ?? '')
    setFabricante(produto?.fabricante ?? '')
    setSku(produto?.sku ?? '')
    setPrecoVenda(produto?.preco_venda != null ? String(produto.preco_venda) : '')
    setStatus(produto?.status ?? 'ativo')
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
      <DialogContent>
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
              <Select value={status} onValueChange={(v) => setStatus(v as 'ativo' | 'inativo')}>
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
