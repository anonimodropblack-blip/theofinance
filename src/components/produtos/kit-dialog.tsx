'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Loader2, Plus, X } from 'lucide-react'
import { custoRealKit, estoqueDisponivelKit } from '@/lib/kits'
import type { KitComponente, Produto } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kit: Produto | null
  componentesAtuais: KitComponente[]
  produtosDisponiveis: Produto[]
  custoUnitarioPorProduto: Record<string, number | null>
  estoqueTotalPorProduto: Record<string, number | undefined>
  onSaved: () => void
}

type LinhaComponente = { componenteId: string; quantidade: string }

function formatCurrency(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function KitDialog({
  open,
  onOpenChange,
  kit,
  componentesAtuais,
  produtosDisponiveis,
  custoUnitarioPorProduto,
  estoqueTotalPorProduto,
  onSaved,
}: Props) {
  const [supabase] = useState(() => createClient())
  const [nome, setNome] = useState('')
  const [sku, setSku] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [linhas, setLinhas] = useState<LinhaComponente[]>([])
  const [novoComponenteId, setNovoComponenteId] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('1')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNome(kit?.nome ?? '')
    setSku(kit?.sku ?? '')
    setPrecoVenda(kit?.preco_venda != null ? String(kit.preco_venda) : '')
    setStatus(kit?.status ?? 'ativo')
    setLinhas(componentesAtuais.map((c) => ({ componenteId: c.componente_id, quantidade: String(c.quantidade) })))
    setNovoComponenteId('')
    setNovaQuantidade('1')
  }, [open, kit, componentesAtuais])

  const produtosPorId = useMemo(() => new Map(produtosDisponiveis.map((p) => [p.id, p])), [produtosDisponiveis])
  const idsUsados = new Set(linhas.map((l) => l.componenteId))
  const opcoesDisponiveis = produtosDisponiveis.filter((p) => !p.eh_kit && !idsUsados.has(p.id))

  function adicionarComponente() {
    const qtd = parseInt(novaQuantidade, 10)
    if (!novoComponenteId || !qtd || qtd <= 0) {
      toast.error('Escolha um produto e uma quantidade válida.')
      return
    }
    setLinhas((prev) => [...prev, { componenteId: novoComponenteId, quantidade: String(qtd) }])
    setNovoComponenteId('')
    setNovaQuantidade('1')
  }

  function removerComponente(componenteId: string) {
    setLinhas((prev) => prev.filter((l) => l.componenteId !== componenteId))
  }

  function alterarQuantidade(componenteId: string, quantidade: string) {
    setLinhas((prev) => prev.map((l) => (l.componenteId === componenteId ? { ...l, quantidade } : l)))
  }

  const componentesValidos: KitComponente[] = linhas
    .map((l) => ({ id: '', kit_id: '', componente_id: l.componenteId, quantidade: parseInt(l.quantidade, 10) || 0, created_at: '' }))
    .filter((c) => c.quantidade > 0)

  const custoEstimado = custoRealKit(componentesValidos, custoUnitarioPorProduto)
  const estoqueDisponivel = estoqueDisponivelKit(componentesValidos, estoqueTotalPorProduto)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (componentesValidos.length === 0) {
      toast.error('Adicione pelo menos um produto ao kit.')
      return
    }
    setSaving(true)

    const payload = {
      nome: nome.trim(),
      sku: sku.trim() || null,
      preco_venda: precoVenda ? Number(precoVenda.replace(',', '.')) : null,
      status,
      eh_kit: true,
    }

    const { data: salvo, error } = kit
      ? await supabase.from('produtos').update(payload).eq('id', kit.id).select('id').single()
      : await supabase.from('produtos').insert(payload).select('id').single()

    if (error || !salvo) {
      setSaving(false)
      toast.error('Erro ao salvar kit.')
      return
    }

    await supabase.from('kit_componentes').delete().eq('kit_id', salvo.id)
    const linhasParaSalvar = componentesValidos.map((c) => ({
      kit_id: salvo.id,
      componente_id: c.componente_id,
      quantidade: c.quantidade,
    }))
    const { error: errorComponentes } = await supabase.from('kit_componentes').insert(linhasParaSalvar)

    setSaving(false)
    if (errorComponentes) {
      toast.error('Kit salvo, mas houve erro ao salvar os componentes.')
      return
    }
    toast.success(kit ? 'Kit atualizado' : 'Kit criado')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{kit ? 'Editar kit' : 'Novo kit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-kit">Nome</Label>
            <Input id="nome-kit" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus placeholder="Ex: Kit Imunidade" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sku-kit">SKU</Label>
              <Input id="sku-kit" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco-venda-kit">Preço de venda (R$)</Label>
              <Input
                id="preco-venda-kit"
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

          <div className="space-y-2">
            <Label>Componentes do kit</Label>
            <p className="text-xs text-muted-foreground">
              Escolha produtos já cadastrados e a quantidade de cada um dentro do kit.
            </p>

            {linhas.length > 0 && (
              <div className="space-y-1.5">
                {linhas.map((l) => (
                  <div key={l.componenteId} className="flex items-center gap-2">
                    <span className="flex-1 text-sm truncate">{produtosPorId.get(l.componenteId)?.nome ?? '?'}</span>
                    <Input
                      inputMode="numeric"
                      className="w-16 text-right"
                      value={l.quantidade}
                      onChange={(e) => alterarQuantidade(l.componenteId, e.target.value)}
                    />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removerComponente(l.componenteId)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Select
                value={novoComponenteId}
                onValueChange={(v) => setNovoComponenteId(v ?? '')}
                items={Object.fromEntries(opcoesDisponiveis.map((p) => [p.id, p.nome]))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar produto..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDisponiveis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="numeric"
                className="w-16 text-right"
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value)}
              />
              <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={adicionarComponente}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {componentesValidos.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo estimado do kit</span>
                <span className="font-medium">{custoEstimado ? formatCurrency(custoEstimado.custoUnitario) : 'sem custo cadastrado nos componentes'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dá pra montar agora</span>
                <span className="font-medium">{estoqueDisponivel} kit(s), com o estoque atual</span>
              </div>
            </div>
          )}

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
