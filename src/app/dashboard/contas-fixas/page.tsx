'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, CircleDollarSign } from 'lucide-react'
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
    type: 'expense' as 'expense' | 'income',
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
        type: formData.type,
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
        type: 'expense',
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
      frequency: account.frequency as 'monthly',
      type: (account.type ?? 'expense') as 'expense' | 'income',
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

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Contas fixas</h1>
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
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Contas fixas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie suas despesas e receitas recorrentes.</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null)
            setFormData({
              name: '',
              amount: '',
              frequency: 'monthly',
              type: 'expense',
              due_date: '',
              category: '',
              description: '',
            })
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova conta fixa
        </button>
      </div>

      {/* Summary */}
      {activeAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Total mensal</p>
            <p className="text-2xl font-semibold text-[var(--danger)] tabular-nums mt-2">{formatBRL(totalMonthly)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Contas ativas</p>
            <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-2">{activeAccounts.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Total de contas</p>
            <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-2">{accounts.length}</p>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <p className="text-[var(--text)] font-medium">Nenhuma conta fixa criada ainda</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Crie uma conta fixa para rastrear suas despesas recorrentes.</p>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-5">
              {editingAccount ? 'Editar conta fixa' : 'Nova conta fixa'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base w-full"
                  placeholder="Ex: Aluguel, Internet"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input-base w-full"
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })}
                  className="input-base w-full"
                >
                  <option value="expense">Despesa recorrente</option>
                  <option value="income">Receita recorrente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Frequência</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="input-base w-full"
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
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Dia do vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input-base w-full"
                  placeholder="1-31"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-base w-full"
                  placeholder="Ex: Moradia, Serviços"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-base w-full resize-none"
                  placeholder="Adicione notas opcionais"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingAccount ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
