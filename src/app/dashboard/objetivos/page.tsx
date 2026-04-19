'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Target } from 'lucide-react'
import SavingsGoalCard from '@/components/SavingsGoalCard'
import type { SavingsGoal } from '@/types'

export default function SavingsGoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    icon: 'target',
    color: '#3B82F6',
    deadline: '',
  })
  const [contributeAmount, setContributeAmount] = useState('')

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    try {
      const res = await fetch('/api/savings-goals')
      const data = await res.json()
      setGoals(data.savingsGoals || [])
    } catch (err) {
      console.error('Load goals error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          target_amount: parseFloat(formData.target_amount),
          icon: formData.icon,
          color: formData.color,
          deadline: formData.deadline || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setGoals([data.savingsGoal, ...goals])
        setFormData({
          name: '',
          target_amount: '',
          icon: 'target',
          color: '#3B82F6',
          deadline: '',
        })
        setShowCreateModal(false)
      }
    } catch (err) {
      console.error('Create error:', err)
    }
  }

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGoal) return

    try {
      const amount = parseFloat(contributeAmount)
      const res = await fetch(`/api/savings-goals/${selectedGoal.id}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: null,
        }),
      })

      if (res.ok) {
        const newAmount = Math.min(
          selectedGoal.current_amount + amount,
          selectedGoal.target_amount
        )
        const updatedGoal = { ...selectedGoal, current_amount: newAmount }
        setGoals(goals.map((g) => (g.id === selectedGoal.id ? updatedGoal : g)))
        setContributeAmount('')
        setShowContributeModal(false)
        setSelectedGoal(null)
      }
    } catch (err) {
      console.error('Contribute error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/savings-goals/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setGoals(goals.filter((g) => g.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleEdit = (goal: SavingsGoal) => {
    setSelectedGoal(goal)
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      icon: goal.icon,
      color: goal.color,
      deadline: goal.deadline || '',
    })
    setShowCreateModal(true)
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalAccumulated = goals.reduce((sum, g) => sum + g.current_amount, 0)

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Caixinhas</h1>
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
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Caixinhas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Alcance suas metas financeiras passo a passo.</p>
        </div>
        <button
          onClick={() => {
            setSelectedGoal(null)
            setFormData({
              name: '',
              target_amount: '',
              icon: 'target',
              color: '#3B82F6',
              deadline: '',
            })
            setShowCreateModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova caixinha
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Meta total</p>
            <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-2">{formatBRL(totalTarget)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Acumulado</p>
            <p className="text-2xl font-semibold text-[var(--success)] tabular-nums mt-2">{formatBRL(totalAccumulated)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Caixinhas</p>
            <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-2">{goals.length}</p>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
            <Target className="h-6 w-6" />
          </div>
          <p className="text-[var(--text)] font-medium">Nenhuma caixinha criada ainda</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Crie uma caixinha para rastrear suas metas financeiras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onContribute={(g) => {
                setSelectedGoal(g)
                setShowContributeModal(true)
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-5">
              {selectedGoal ? 'Editar caixinha' : 'Nova caixinha'}
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base w-full"
                  placeholder="Ex: Férias, Carro novo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Meta (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  className="input-base w-full"
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Ícone</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="input-base w-full"
                  >
                    <option value="target">Meta</option>
                    <option value="plane">Férias</option>
                    <option value="house">Casa</option>
                    <option value="car">Carro</option>
                    <option value="book">Educação</option>
                    <option value="gem">Luxo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Cor</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-[42px] rounded-xl cursor-pointer border border-[var(--border)] bg-[var(--bg-elevated)] p-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Prazo (opcional)</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="input-base w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {selectedGoal ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-5">
              Contribuir para {selectedGoal.name}
            </h2>

            <form onSubmit={handleContributeSubmit} className="space-y-4">
              <div className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Saldo atual</span>
                  <span className="text-[var(--text)] font-semibold tabular-nums">{formatBRL(selectedGoal.current_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Faltam</span>
                  <span className="text-[var(--danger)] font-semibold tabular-nums">{formatBRL(selectedGoal.target_amount - selectedGoal.current_amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="input-base w-full"
                  placeholder="0,00"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowContributeModal(false)
                    setSelectedGoal(null)
                    setContributeAmount('')
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[var(--success)] hover:opacity-90 text-white px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  Contribuir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
