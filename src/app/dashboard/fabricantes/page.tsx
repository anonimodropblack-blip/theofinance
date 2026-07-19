'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Loader2, Factory } from 'lucide-react'
import { FabricanteDialog } from '@/components/fabricantes/fabricante-dialog'
import { toast } from 'sonner'
import type { Fabricante } from '@/types'

export default function FabricantesPage() {
  const supabase = createClient()
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Fabricante | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('fabricantes').select('*').order('nome')
    setFabricantes((data ?? []) as Fabricante[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = fabricantes.filter((f) => {
    const q = busca.toLowerCase()
    return !q || f.nome.toLowerCase().includes(q) || (f.contato_responsavel ?? '').toLowerCase().includes(q)
  })

  function abrirNovo() {
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(f: Fabricante) {
    setEditando(f)
    setDialogOpen(true)
  }

  async function excluirFabricante(f: Fabricante) {
    if (!window.confirm(`Excluir "${f.nome}"? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('fabricantes').delete().eq('id', f.id)
    if (error) {
      toast.error(`Não foi possível excluir "${f.nome}".`)
      return
    }
    toast.success(`"${f.nome}" excluído`)
    carregar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Fabricantes</h1>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo Fabricante
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar fabricante ou contato..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Factory className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{fabricantes.length === 0 ? 'Nenhum fabricante cadastrado ainda.' : 'Nenhum fabricante encontrado.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Contato Responsável</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((f) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => abrirEdicao(f)}>
                  <TableCell className="font-medium whitespace-nowrap">{f.nome}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{f.telefone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{f.whatsapp ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{f.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{f.site ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{f.contato_responsavel ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{f.endereco ?? '—'}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEdicao(f)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => excluirFabricante(f)} className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <FabricanteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fabricante={editando}
        onSaved={carregar}
      />
    </div>
  )
}
