'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { CategoriaBadge } from '@/components/financeiro/categoria-badge'
import type { CategoriaFinanceira } from '@/types'

type Props = {
  categorias: CategoriaFinanceira[]
  value: string
  onSelect: (categoria: CategoriaFinanceira) => void
  placeholder?: string
}

export function CategoriaPicker({ categorias, value, onSelect, placeholder }: Props) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const selecionada = categorias.find((c) => c.id === value) ?? null
  const ativas = categorias.filter((c) => c.ativo)
  const sugestoes = ativas.filter((c) => c.nome.toLowerCase().includes(texto.toLowerCase())).slice(0, 8)

  function selecionar(c: CategoriaFinanceira) {
    onSelect(c)
    setTexto('')
    setAberto(false)
  }

  return (
    <div ref={ref} className="relative">
      {selecionada && !aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="h-8 w-full flex items-center gap-2 px-3 rounded-md border border-border bg-muted text-sm text-left"
        >
          <CategoriaBadge icone={selecionada.icone} cor={selecionada.cor} />
          {selecionada.nome}
        </button>
      ) : (
        <Input
          placeholder={placeholder ?? 'Buscar categoria...'}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setAberto(true)}
        />
      )}
      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {sugestoes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selecionar(c)}
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <CategoriaBadge icone={c.icone} cor={c.cor} />
              {c.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
