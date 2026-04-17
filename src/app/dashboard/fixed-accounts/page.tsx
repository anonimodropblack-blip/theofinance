'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import FixedAccountCard from '@/components/FixedAccountCard'
import type { FixedAccount } from '@/types'

export default function FixedAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<FixedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FixedAccount | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as const,
    due_date: '',
    category: '',
    description: '',
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/fixed-accounts')
      const data = await res.json()
      setAccounts(data.fixedAccounts || [])
    } catch (err) {
      console.error('Load accounts error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        due_date: formData.due_date ? parseInt(formData.due_date) : null,
        category: formData.category || null,
        description: formData.description || null,
      }

      if (editingAccount) {
        const res = await fetch(`/api/fixed-accounts/${editingAccount.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const data = await res.json()
          setAccounts(accounts.map((a) => (a.id === data.fixedAccount.id ? data.fixedAccount : a)))
        }
      } else {
        const res = await fetch('/api/fixed-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const data = await res.json()
          setAccounts([data.fixedAccount, ...accounts])
        }
      }

      setFormData({
        name: '',
        amount: '',
        frequency: 'monthly',
        due_date: '',
        category: '',
        description: '',
      })
      setEditingAccount(null)
      setShowModal(false)
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/fixed-accounts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAccounts(accounts.filter((a) => a.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) return

    try {
      const res = await fetch(`/api/fixed-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...account, is_active: isActive }),
      })

      if (res.ok) {
        const data = await res.json()
        setAccounts(accounts.map((a) => (a.id === id ? data.fixedAccount : a)))
      }
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const handleEdit = (account: FixedAccount) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      amount: account.amount.toString(),
      frequency: account.frequency,
      due_date: account.due_date?.toString() || '',
      category: account.category || '',
      description: account.description || '',
    })
    setShowModal(true)
  }

  const activeAccounts = accounts.filter((a) => a.is_active)
  const totalMonthly = activeAccounts
    .filter((a) => a.frequency === 'monthly')
    .reduce((sum, a) => sum + a.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contas Fixas</h1>
            <p className="text-sm text-slate-400">Gerencie suas despesas recorrentes</p>
          </div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Summary */}
        {activeAccounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">TOTAL MENSAL</p>
              <p className="text-2xl font-bold text-rose-400">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalMonthly)}
              </p>
            </div>
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">CONTAS ATIVAS</p>
              <p className="text-2xl font-bold text-white">{activeAccounts.length}</p>
            </div>
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">TOTAL DE CONTAS</p>
              <p className="text-2xl font-bold text-white">{accounts.length}</p>
            </div>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={() => {
            setEditingAccount(null)
            setFormData({
              name: '',
              amount: '',
              frequency: 'monthly',
              due_date: '',
              category: '',
              description: '',
            })
            setShowModal(true)
          }}
          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
        >
          + Nova Conta Fixa
        </button>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-slate-400">Nenhuma conta fixa criada ainda</p>
            <p className="text-sm text-slate-500 mt-2">
              Crie uma conta fixa para rastrear suas despesas recorrentes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <FixedAccountCard
                key={account.id}
                account={account}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingAccount ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nome*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
                    placeholder="Ex: Aluguel, Internet"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Valor*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Frequência*</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                    <option value="bimonthly">Bimensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Dia do Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
                    placeholder="1-31"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
                    placeholder="Ex: Moradia, Serviços"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Observações</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
                    placeholder="Adicione notas opcionais"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors font-medium"
                  >
                    {editingAccount ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
