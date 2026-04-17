'use client'

import type { SavingsGoal } from '@/types'

interface SavingsGoalCardProps {
  goal: SavingsGoal
  onContribute: (goal: SavingsGoal) => void
  onEdit: (goal: SavingsGoal) => void
  onDelete: (id: string) => void
}

export default function SavingsGoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: SavingsGoalCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const progress = (goal.current_amount / goal.target_amount) * 100
  const remaining = goal.target_amount - goal.current_amount
  const daysLeft = goal.deadline
    ? Math.ceil(
        (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div
      className={`p-6 border rounded-lg transition-opacity ${
        goal.is_active
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-slate-800/30 border-slate-700/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{goal.icon}</span>
          <div>
            <h3 className="font-semibold text-white">{goal.name}</h3>
            {daysLeft !== null && (
              <p className="text-xs text-slate-400">
                {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onEdit(goal)}
          className="text-2xl hover:scale-110 transition-transform"
        >
          ✏️
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progresso</span>
          <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: goal.color,
            }}
          ></div>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div className="p-2 bg-slate-900/50 rounded">
          <p className="text-xs text-slate-400">Acumulado</p>
          <p className="font-semibold text-white">
            {formatCurrency(goal.current_amount)}
          </p>
        </div>
        <div className="p-2 bg-slate-900/50 rounded">
          <p className="text-xs text-slate-400">Meta</p>
          <p className="font-semibold text-white">
            {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <div className="p-2 bg-slate-900/50 rounded">
          <p className="text-xs text-slate-400">Faltam</p>
          <p className="font-semibold text-rose-400">
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onContribute(goal)}
          className="flex-1 px-3 py-2 bg-green-900/30 hover:bg-green-900/50 text-green-300 rounded text-sm font-medium transition-colors"
        >
          Contribuir
        </button>
        <button
          onClick={() => onEdit(goal)}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm('Tem certeza?')) {
              onDelete(goal.id)
            }
          }}
          className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded text-sm transition-colors"
        >
          Deletar
        </button>
      </div>
    </div>
  )
}
