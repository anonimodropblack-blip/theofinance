'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Fabricante } from '@/types'

type Props = {
  value: string
  onChange: (value: string) => void
  fabricantes: Fabricante[]
  placeholder?: string
}

// Texto livre com autocomplete: digita normal, e se o nome já existir em `fabricantes`
// aparece como sugestão clicável. Nomes novos são criados automaticamente ao salvar o produto
// (ver ProdutoDialog) — não precisa cadastrar o fabricante antes pra poder digitar.
export function FabricanteInput({ value, onChange, fabricantes, placeholder }: Props) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const sugestoes = value.trim()
    ? fabricantes.filter((f) => f.nome.toLowerCase().includes(value.toLowerCase()) && f.nome !== value).slice(0, 6)
    : []

  return (
    <div ref={ref} className="relative">
      <Input
        id="fabricante"
        placeholder={placeholder ?? 'Digite ou selecione...'}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        autoComplete="off"
      />
      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {sugestoes.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { onChange(f.nome); setAberto(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {f.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
