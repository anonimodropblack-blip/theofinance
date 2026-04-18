'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
    icon: '📌',
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
      setFormData({ name: '', color: '#6b7280', icon: '📌' })
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const filteredCategories = categories.filter((c) => c.type === tab)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Configurações</h2>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700">
        <button
          onClick={() => setTab('expense')}
          className={`pb-2 font-medium transition-colors ${
            tab === 'expense'
              ? 'text-rose-500 border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Categorias de Despesa
        </button>
        <button
          onClick={() => setTab('income')}
          className={`pb-2 font-medium transition-colors ${
            tab === 'income'
              ? 'text-rose-500 border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Categorias de Receita
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {tab === 'expense' ? 'Despesas' : 'Receitas'}
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
        >
          + Nova Categoria
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : filteredCategories.length === 0 ? (
        <div className="p-8 text-center bg-slate-800 border border-slate-700 rounded-lg">
          <p className="text-slate-400">Nenhuma categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="p-4 bg-slate-800 border border-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <p className="font-medium text-white">{category.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-xs text-slate-400">
                      {category.color}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Nova Categoria
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                  placeholder="Ex: Supermercado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ícone
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['shopping-cart','utensils','car','home','pill','book','film','plane'].map(
                    (emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, icon: emoji })
                        }
                        className={`w-8 h-8 rounded text-lg ${
                          formData.icon === emoji
                            ? 'bg-rose-600'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        {emoji}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cor
                </label>
                <div className="flex gap-2">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color
                            ? 'border-white'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      ></button>
                    )
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                >
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
