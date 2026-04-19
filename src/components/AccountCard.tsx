'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface AccountCardProps {
  id: string
  name: string
  type: string
  balance: number
  color: string
  currency?: string
  isFavorite?: boolean
  onFavoriteToggle?: (accountId: string, isFav: boolean) => void
}

const typeLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit: 'Cartão de Crédito',
  cash: 'Dinheiro',
}

export default function AccountCard({
  id,
  name,
  type,
  balance,
  color,
  currency = 'BRL',
  isFavorite = false,
  onFavoriteToggle,
}: AccountCardProps) {
  const [favLoading, setFavLoading] = useState(false)

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setFavLoading(true)

    try {
      const method = isFavorite ? 'DELETE' : 'POST'
      const response = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      })

      if (response.ok) {
        onFavoriteToggle?.(id, !isFavorite)
      }
    } catch (err) {
      console.error('Toggle favorite error:', err)
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <Link href={`/dashboard/contas/${id}`}>
      <div className="card card-hover p-5 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
              {name}
            </h3>
            <p className="text-xs text-[var(--text-subtle)] mt-0.5">{typeLabels[type] ?? type}</p>
          </div>

          <button
            onClick={handleFavoriteToggle}
            disabled={favLoading}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-[var(--text-subtle)] hover:text-[var(--gold)] hover:bg-[var(--gold-subtle)] transition-colors"
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-label={isFavorite ? 'Remover favorito' : 'Favoritar'}
          >
            <Star
              className="h-4 w-4"
              fill={isFavorite ? 'currentColor' : 'none'}
              style={isFavorite ? { color: 'var(--gold)' } : undefined}
              strokeWidth={2}
            />
          </button>
        </div>

        <div
          className="w-8 h-1 rounded-full mb-4"
          style={{ backgroundColor: color }}
        />

        <div className="pt-3 border-t border-[var(--border)]">
          <p className="text-2xl font-semibold text-[var(--text)] tabular-nums">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency,
            }).format(balance || 0)}
          </p>
        </div>
      </div>
    </Link>
  )
}
