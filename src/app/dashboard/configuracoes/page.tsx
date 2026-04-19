'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Tag } from 'lucide-react'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'income' | 'expense'>('expense')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    color: '#6b7280',
    icon: 'tag',
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load categories')
      }

      setCategories(data.categories || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: tab,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category')
      }

      setCategories([...categories, data.category])
      setFormData({ name: '', color: '#6b7280', icon: 'tag' })
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const filteredCategories = categories.filter((c) => c.type === tab)

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Configurações</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie categorias de receitas e despesas.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] w-fit">
        <button
          onClick={() => setTab('expense')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'expense'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Despesas
        </button>
        <button
          onClick={() => setTab('income')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'income'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Receitas
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text)]">
          Categorias de {tab === 'expense' ? 'despesa' : 'receita'}
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova categoria
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando...</p>
      ) : filteredCategories.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
            <Tag className="h-6 w-6" />
          </div>
          <p className="text-[var(--text)] font-medium">Nenhuma categoria</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Crie uma categoria para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{category.name}</p>
                  <p className="text-xs text-[var(--text-subtle)]">{category.color}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-4">Nova categoria</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-base w-full"
                  placeholder="Ex: Supermercado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${
                        formData.color === color
                          ? 'border-[var(--text)] scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
