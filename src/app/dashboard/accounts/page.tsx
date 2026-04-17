'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Account } from '@/types'

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as 'checking' | 'savings' | 'credit' | 'cash',
    color: '#3b82f6',
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load accounts')
      }

      setAccounts(data.accounts || [])
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
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      setAccounts([data.account, ...accounts])
      setFormData({ name: '', type: 'checking', color: '#3b82f6' })
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const typeColors = {
    checking: 'bg-blue-600',
    savings: 'bg-green-600',
    credit: 'bg-red-600',
    cash: 'bg-amber-600',
  }

  const typeLabels = {
    checking: 'Conta Corrente',
    savings: 'Poupança',
    credit: 'Cartão de Crédito',
    cash: 'Dinheiro',
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Contas</h2>
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Contas</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
        >
          + Nova Conta
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="p-8 text-center bg-slate-800 border border-slate-700 rounded-lg">
          <p className="text-slate-400">Nenhuma conta criada ainda</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-rose-500 hover:text-rose-400"
          >
            Criar primeira conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
              className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-rose-600 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{account.name}</h3>
                  <p className="text-xs text-slate-400">
                    {typeLabels[account.type]}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${account.color || 'bg-blue-600'}`}
                  style={{ backgroundColor: account.color }}
                ></div>
              </div>

              <div className="pt-3 border-t border-slate-700">
                <p className="text-2xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: account.currency || 'BRL',
                  }).format(account.balance || 0)}
                </p>
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
              Nova Conta
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
                  placeholder="Minha conta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="credit">Cartão de Crédito</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cor
                </label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'].map(
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
