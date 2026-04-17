'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    icon: '🎯',
    color: '#ec4899',
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
          icon: '🎯',
          color: '#ec4899',
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
        // Update goal with new amount
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
            <h1 className="text-2xl font-bold text-white">Caixinhas 🎯</h1>
            <p className="text-sm text-slate-400">Alcance suas metas financeiras</p>
          </div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Summary */}
        {goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">META TOTAL</p>
              <p className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalTarget)}
              </p>
            </div>
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">ACUMULADO</p>
              <p className="text-2xl font-bold text-green-400">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalAccumulated)}
              </p>
            </div>
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">CAIXINHAS</p>
              <p className="text-2xl font-bold text-white">{goals.length}</p>
            </div>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={() => {
            setSelectedGoal(null)
            setFormData({
              name: '',
              target_amount: '',
              icon: '🎯',
              color: '#ec4899',
              deadline: '',
            })
            setShowCreateModal(true)
          }}
          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
        >
          + Nova Caixinha
        </button>

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-slate-400">Nenhuma caixinha criada ainda</p>
            <p className="text-sm text-slate-500 mt-2">
              Crie uma caixinha para rastrear suas metas financeiras
            </p>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                {selectedGoal ? 'Editar Caixinha' : 'Nova Caixinha'}
              </h2>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nome*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="Ex: Férias, Carro novo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Meta*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Ícone</label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    >
                      <option value="🎯">🎯 Meta</option>
                      <option value="✈️">✈️ Férias</option>
                      <option value="🏠">🏠 Casa</option>
                      <option value="🚗">🚗 Carro</option>
                      <option value="📚">📚 Educação</option>
                      <option value="💎">💎 Luxo</option>
                      <option value="🎮">🎮 Entretenimento</option>
                      <option value="❤️">❤️ Família</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Cor</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Prazo (opcional)</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors font-medium"
                  >
                    {selectedGoal ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contribute Modal */}
        {showContributeModal && selectedGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                Contribuir para "{selectedGoal.name}"
              </h2>

              <form onSubmit={handleContributeSubmit} className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">
                    Saldo atual:{' '}
                    <span className="text-white font-semibold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(selectedGoal.current_amount)}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400 mb-4">
                    Faltam:{' '}
                    <span className="text-rose-400 font-semibold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(selectedGoal.target_amount - selectedGoal.current_amount)}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Valor*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContributeModal(false)
                      setSelectedGoal(null)
                      setContributeAmount('')
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
                  >
                    Contribuir
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
