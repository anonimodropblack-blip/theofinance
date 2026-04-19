'use client'

import { Pencil, Trash2 } from 'lucide-react'
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
    <div className={`card p-6 ${!goal.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: goal.color }}
          >
            <span className="text-lg font-semibold">{goal.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text)] truncate">{goal.name}</h3>
            {daysLeft !== null && (
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Tem certeza?')) onDelete(goal.id)
            }}
            className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
            aria-label="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-subtle)]">Progresso</span>
          <span className="text-xs font-medium text-[var(--text)]">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--bg)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: goal.color,
            }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Acumulado</p>
          <p className="text-sm font-semibold text-[var(--text)] tabular-nums mt-1">
            {formatCurrency(goal.current_amount)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Meta</p>
          <p className="text-sm font-semibold text-[var(--text)] tabular-nums mt-1">
            {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Faltam</p>
          <p className="text-sm font-semibold text-[var(--danger)] tabular-nums mt-1">
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={() => onContribute(goal)}
        className="w-full inline-flex items-center justify-center rounded-xl bg-[var(--success-subtle)] hover:bg-[var(--success)] hover:text-white text-[var(--success)] px-3 py-2.5 text-sm font-medium transition-colors"
      >
        Contribuir
      </button>
    </div>
  )
}
