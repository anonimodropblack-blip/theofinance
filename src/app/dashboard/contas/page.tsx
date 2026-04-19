'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Wallet } from 'lucide-react'
import AccountCard from '@/components/AccountCard'
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
    is_private: false,
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
      setFormData({ name: '', type: 'checking', color: '#3b82f6', is_private: false })
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Contas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Contas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie suas contas bancárias, cartões e dinheiro.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
            <Wallet className="h-6 w-6" />
          </div>
          <p className="text-[var(--text)] font-medium">Nenhuma conta criada ainda</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Crie sua primeira conta para começar.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-medium"
          >
            Criar primeira conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              id={account.id}
              name={account.name}
              type={account.type}
              balance={account.balance || 0}
              color={account.color}
              currency={account.currency || 'BRL'}
              onFavoriteToggle={() => {}}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-4">Nova conta</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-base w-full"
                  placeholder="Minha conta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-base w-full"
                >
                  <option value="checking">Conta corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="credit">Cartão de crédito</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Cor</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'].map((color) => (
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

              <label className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Conta privada</p>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                    Não aparece na visão compartilhada do casal.
                  </p>
                </div>
              </label>

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
