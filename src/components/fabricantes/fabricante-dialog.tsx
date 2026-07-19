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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Fabricante } from '@/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fabricante: Fabricante | null
  onSaved: () => void
}

export function FabricanteDialog({ open, onOpenChange, fabricante, onSaved }: Props) {
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [site, setSite] = useState('')
  const [endereco, setEndereco] = useState('')
  const [contatoResponsavel, setContatoResponsavel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNome(fabricante?.nome ?? '')
    setTelefone(fabricante?.telefone ?? '')
    setWhatsapp(fabricante?.whatsapp ?? '')
    setEmail(fabricante?.email ?? '')
    setSite(fabricante?.site ?? '')
    setEndereco(fabricante?.endereco ?? '')
    setContatoResponsavel(fabricante?.contato_responsavel ?? '')
  }, [open, fabricante])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      site: site.trim() || null,
      endereco: endereco.trim() || null,
      contato_responsavel: contatoResponsavel.trim() || null,
    }

    const { error } = fabricante
      ? await supabase.from('fabricantes').update(payload).eq('id', fabricante.id)
      : await supabase.from('fabricantes').insert(payload)

    setSaving(false)

    if (error) {
      toast.error(error.code === '23505' ? 'Já existe um fabricante com esse nome.' : 'Erro ao salvar fabricante.')
      return
    }

    toast.success(fabricante ? 'Fabricante atualizado' : 'Fabricante criado')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fabricante ? 'Editar fabricante' : 'Novo fabricante'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input id="site" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contato_responsavel">Contato responsável</Label>
            <Input id="contato_responsavel" value={contatoResponsavel} onChange={(e) => setContatoResponsavel(e.target.value)} placeholder="Nome de quem você fala normalmente" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
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
