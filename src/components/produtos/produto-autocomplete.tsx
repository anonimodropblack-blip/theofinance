'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Produto } from '@/types'

type Props = {
  produtos: Produto[]
  onSelect: (produto: Produto) => void
  placeholder?: string
  excludeIds?: string[]
}

export function ProdutoAutocomplete({ produtos, onSelect, placeholder, excludeIds = [] }: Props) {
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

  const sugestoes = texto.trim()
    ? produtos
        .filter((p) => !excludeIds.includes(p.id))
        .filter((p) => p.nome.toLowerCase().includes(texto.toLowerCase()))
        .slice(0, 6)
    : []

  function selecionar(p: Produto) {
    onSelect(p)
    setTexto('')
    setAberto(false)
  }

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder={placeholder ?? 'Digite o nome do produto...'}
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {sugestoes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selecionar(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
