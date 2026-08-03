'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Package, Factory } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CommandPaletteItem = {
  href: string
  label: string
  sublabel?: string
  icon: LucideIcon
}

export function CommandPalette({ items }: { items: CommandPaletteItem[] }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [entidades, setEntidades] = useState<CommandPaletteItem[] | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function alternarAberto(v: boolean) {
    setOpen(v)
    if (!v) setQuery('')
    if (v && entidades === null) carregarEntidades()
  }

  async function carregarEntidades() {
    const [{ data: produtos }, { data: fabricantes }] = await Promise.all([
      supabase.from('produtos').select('nome, sku').eq('status', 'ativo').order('nome'),
      supabase.from('fabricantes').select('nome').order('nome'),
    ])

    const itensProdutos: CommandPaletteItem[] = (produtos ?? []).map((p) => ({
      href: `/dashboard/produtos?busca=${encodeURIComponent(p.nome)}`,
      label: p.nome,
      sublabel: p.sku ? `SKU ${p.sku}` : undefined,
      icon: Package,
    }))
    const itensFabricantes: CommandPaletteItem[] = (fabricantes ?? []).map((f) => ({
      href: `/dashboard/fabricantes?busca=${encodeURIComponent(f.nome)}`,
      label: f.nome,
      sublabel: 'Fabricante',
      icon: Factory,
    }))

    setEntidades([...itensProdutos, ...itensFabricantes])
  }

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    const todos = [...items, ...(entidades ?? [])]
    return todos.filter((item) => item.label.toLowerCase().includes(q) || item.sublabel?.toLowerCase().includes(q))
  }, [items, entidades, query])

  function irPara(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => alternarAberto(true)}
        className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Pesquisar</span>
        <kbd className="rounded border border-sidebar-border px-1 font-sans text-[10px]">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={alternarAberto}>
        <DialogContent
          showCloseButton={false}
          className="top-[20%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Pesquisar</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Ir para uma página, produto ou fabricante..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {resultados.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              resultados.map(({ href, label, sublabel, icon: Icon }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => irPara(href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {sublabel && <span className="shrink-0 text-xs text-muted-foreground">{sublabel}</span>}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
