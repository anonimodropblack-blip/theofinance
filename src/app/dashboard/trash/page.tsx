'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-[var(--text-subtle)] hover:text-[var(--text)] text-sm mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Lixeira</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Itens excluídos — restaure ou remova permanentemente
          </p>
        </div>
        {items.length > 0 && (
          <span className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] text-sm px-3 py-1 rounded-full">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center text-[var(--text-muted)] py-12">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg)] text-[var(--text-subtle)] mb-3">
            <Trash2 className="h-5 w-5" />
          </div>
          <p className="text-[var(--text)] font-medium">Lixeira vazia</p>
          <p className="text-[var(--text-subtle)] text-sm mt-1">Itens excluídos aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([entityType, groupItems]) => (
            <div key={entityType}>
              <h2 className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">
                {entityType} ({groupItems.length})
              </h2>
              <div className="space-y-3">
                {groupItems.map(item => {
                  const val = getItemValue(item)
                  const isRestoring = restoring === item.id
                  const isPurging = purging === item.id
                  return (
                    <div key={item.id} className="card p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-[var(--text)]">{getItemLabel(item)}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
                          {val && <span className="text-[var(--danger)]">{val}</span>}
                          <span>Excluído em {formatDate(item.deleted_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isRestoring || isPurging}
                          className="bg-[var(--success-subtle)] text-[var(--success)] hover:brightness-110 px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
                        >
                          {isRestoring ? 'Restaurando…' : 'Restaurar'}
                        </button>
                        <button
                          onClick={() => handlePurge(item)}
                          disabled={isRestoring || isPurging}
                          className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
                        >
                          {isPurging ? 'Excluindo…' : 'Excluir'}
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
  )
}
