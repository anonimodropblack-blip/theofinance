'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CommandPaletteItem = {
  href: string
  label: string
  icon: LucideIcon
}

export function CommandPalette({ items }: { items: CommandPaletteItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

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
  }

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [items, query])

  function irPara(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
              placeholder="Ir para..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {resultados.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              resultados.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => irPara(href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
