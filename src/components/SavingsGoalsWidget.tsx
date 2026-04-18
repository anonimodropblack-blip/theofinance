'use client'

import Link from 'next/link'
import { ArrowRight, Target } from 'lucide-react'
import type { SavingsGoal } from '@/types'

interface SavingsGoalsWidgetProps {
  goals: SavingsGoal[]
}

export default function SavingsGoalsWidget({ goals }: SavingsGoalsWidgetProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const activeGoals = goals.filter((g) => g.is_active).sort((a, b) => {
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    const progressA = (a.current_amount / a.target_amount) * 100
    const progressB = (b.current_amount / b.target_amount) * 100
    return progressB - progressA
  })

  const topGoals = activeGoals.slice(0, 3)
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalAccumulated = goals.reduce((sum, g) => sum + g.current_amount, 0)

  if (activeGoals.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text)]">Caixinhas</h3>
        </div>
        <Link
          href="/dashboard/savings-goals"
          className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-medium"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 rounded-xl bg-[var(--bg)]">
          <p className="text-xs text-[var(--text-subtle)]">Acumulado</p>
          <p className="font-semibold text-[var(--success)] tabular-nums mt-0.5">
            {formatCurrency(totalAccumulated)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg)]">
          <p className="text-xs text-[var(--text-subtle)]">Meta total</p>
          <p className="font-semibold text-[var(--text)] tabular-nums mt-0.5">
            {formatCurrency(totalTarget)}
          </p>
        </div>
      </div>

      {topGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-2">
            Principais
          </p>
          {topGoals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100
            return (
              <div key={goal.id} className="p-3 rounded-xl bg-[var(--bg)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
                    >
                      <Target className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text)] truncate">
                      {goal.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)] ml-2 tabular-nums">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--border)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
