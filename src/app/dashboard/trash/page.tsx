'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TrashItem {
  id: string
  name?: string
  description?: string
  amount?: number
  total_amount?: number
  deleted_at: string
  _entity_type: string
  _entity_table: string
  [key: string]: unknown
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getItemLabel(item: TrashItem) {
  return item.name || item.description || `Item #${item.id.slice(0, 8)}`
}

function getItemValue(item: TrashItem) {
  const val = item.amount || item.total_amount
  return val ? formatCurrency(Number(val)) : null
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [purging, setPurging] = useState<string | null>(null)

  useEffect(() => { loadTrash() }, [])

  const loadTrash = async () => {
    try {
      const res = await fetch('/api/trash')
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (item: TrashItem) => {
    setRestoring(item.id)
    try {
      await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_table: item._entity_table, entity_id: item.id }),
      })
      loadTrash()
    } finally {
      setRestoring(null)
    }
  }

  const handlePurge = async (item: TrashItem) => {
    if (!confirm(`Excluir permanentemente "${getItemLabel(item)}"? Esta acao nao pode ser desfeita.`)) return
    setPurging(item.id)
    try {
      await fetch('/api/trash/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_table: item._entity_table, entity_id: item.id }),
      })
      loadTrash()
    } finally {
      setPurging(null)
    }
  }

  const groupedItems = items.reduce((acc, item) => {
    const key = item._entity_type
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, TrashItem[]>)

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm mb-2 block">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Lixeira</h1>
            <p className="text-slate-400 text-sm mt-1">
              Itens excluidos — restaure ou exclua permanentemente
            </p>
          </div>
          {items.length > 0 && (
            <span className="bg-slate-700 text-slate-300 text-sm px-3 py-1 rounded-full">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
            <p className="text-4xl mb-3">🗑️</p>
            <p className="text-slate-300 font-medium">Lixeira vazia</p>
            <p className="text-slate-500 text-sm mt-1">Itens excluidos aparecerao aqui</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([entityType, groupItems]) => (
              <div key={entityType}>
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                  {entityType} ({groupItems.length})
                </h2>
                <div className="space-y-3">
                  {groupItems.map(item => {
                    const val = getItemValue(item)
                    const isRestoring = restoring === item.id
                    const isPurging = purging === item.id

                    return (
                      <div key={item.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getItemLabel(item)}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                            {val && <span className="text-rose-400">{val}</span>}
                            <span>Excluido em {formatDate(item.deleted_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={isRestoring || isPurging}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            {isRestoring ? 'Restaurando...' : 'Restaurar'}
                          </button>
                          <button
                            onClick={() => handlePurge(item)}
                            disabled={isRestoring || isPurging}
                            className="bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            {isPurging ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
