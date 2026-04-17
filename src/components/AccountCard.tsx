'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <Link href={`/dashboard/accounts/${id}`}>
      <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-rose-600 cursor-pointer transition-colors group">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white group-hover:text-rose-400 transition-colors">
              {name}
            </h3>
            <p className="text-xs text-slate-400">{typeLabels[type]}</p>
          </div>

          <button
            onClick={handleFavoriteToggle}
            disabled={favLoading}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <span className={`text-lg ${isFavorite ? '⭐' : '☆'}`}>
              {isFavorite ? '⭐' : '☆'}
            </span>
          </button>
        </div>

        <div
          className="w-2 h-2 rounded-full mb-3"
          style={{ backgroundColor: color }}
        ></div>

        <div className="pt-3 border-t border-slate-700">
          <p className="text-2xl font-bold text-white">
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
