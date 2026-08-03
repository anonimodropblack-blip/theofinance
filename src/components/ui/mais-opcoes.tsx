'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MaisOpcoes({ children, defaultOpen = false }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [aberto, setAberto] = useState(defaultOpen)
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} />
        Mais opções
      </button>
      {aberto && <div className="space-y-4">{children}</div>}
    </div>
  )
}
