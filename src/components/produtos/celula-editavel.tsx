'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

type PropsTexto = {
  valor: string
  exibir?: React.ReactNode
  onSalvar: (novoValor: string) => Promise<void>
  align?: 'left' | 'right'
  tipo?: 'text' | 'numeric' | 'decimal'
  placeholder?: string
  vazio?: string
}

// Clica -> vira input focado. Enter ou perde o foco salva. Esc cancela.
export function CelulaEditavel({ valor, exibir, onSalvar, align = 'left', tipo = 'text', placeholder, vazio = '—' }: PropsTexto) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor)
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editando) { inputRef.current?.focus(); inputRef.current?.select() } }, [editando])
  useEffect(() => { if (!editando) setRascunho(valor) }, [valor, editando])

  async function confirmar() {
    if (rascunho === valor) { setEditando(false); return }
    setSalvando(true)
    await onSalvar(rascunho)
    setSalvando(false)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        className={`w-full min-w-[70px] bg-background border border-primary rounded px-1.5 py-1 text-sm outline-none ${align === 'right' ? 'text-right' : ''}`}
        value={rascunho}
        placeholder={placeholder}
        inputMode={tipo === 'text' ? undefined : tipo}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={confirmar}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); confirmar() }
          if (e.key === 'Escape') { e.preventDefault(); setRascunho(valor); setEditando(false) }
        }}
        disabled={salvando}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditando(true) }}
      className={`w-full rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/70 hover:ring-1 hover:ring-border transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : (exibir ?? (valor || vazio))}
    </button>
  )
}

type PropsSelect = {
  valor: string
  opcoes: readonly string[]
  onSalvar: (novoValor: string) => Promise<void>
  exibir?: React.ReactNode
  vazio?: string
}

// Mesma ideia, mas clicar abre um <select> nativo em vez de input de texto.
export function CelulaSelectEditavel({ valor, opcoes, onSalvar, exibir, vazio = '—' }: PropsSelect) {
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => { if (editando) selectRef.current?.focus() }, [editando])

  async function salvar(novoValor: string) {
    if (novoValor === valor) { setEditando(false); return }
    setSalvando(true)
    await onSalvar(novoValor)
    setSalvando(false)
    setEditando(false)
  }

  if (editando) {
    return (
      <select
        ref={selectRef}
        className="w-full min-w-[90px] bg-background border border-primary rounded px-1.5 py-1 text-sm outline-none"
        defaultValue={valor}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => salvar(e.target.value)}
        onBlur={() => setEditando(false)}
        disabled={salvando}
      >
        {opcoes.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditando(true) }}
      className="w-full text-left rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/70 hover:ring-1 hover:ring-border transition-colors"
    >
      {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : (exibir ?? (valor || vazio))}
    </button>
  )
}
