'use client'

import Link from 'next/link'
import type { SavingsGoal } from '@/types'

interface SavingsGoalsWidgetProps {
  goals: SavingsGoal[]
}

export default function SavingsGoalsWidget({ goals }: SavingsGoalsWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const activeGoals = goals.filter((g) => g.is_active).sort((a, b) => {
    // Sort by closest to deadline or by progress
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    // Sort by highest progress
    const progressA = (a.current_amount / a.target_amount) * 100
    const progressB = (b.current_amount / b.target_amount) * 100
    return progressB - progressA
  })

  const topGoals = activeGoals.slice(0, 3)
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalAccumulated = goals.reduce((sum, g) => sum + g.current_amount, 0)

  if (activeGoals.length === 0) {
    return null
  }

  return (
    <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Caixinhas 🎯</h3>
        <Link href="/dashboard/savings-goals" className="text-rose-500 hover:text-rose-400 text-sm">
          Ver todas →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 bg-slate-900/50 rounded">
          <p className="text-xs text-slate-400">Acumulado</p>
          <p className="font-bold text-green-400">{formatCurrency(totalAccumulated)}</p>
        </div>
        <div className="p-3 bg-slate-900/50 rounded">
          <p className="text-xs text-slate-400">Meta Total</p>
          <p className="font-bold text-white">{formatCurrency(totalTarget)}</p>
        </div>
      </div>

      {topGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 mb-3">Principais</p>
          {topGoals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100
            return (
              <div key={goal.id} className="p-3 bg-slate-900/50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{goal.icon}</span>
                    <span className="text-sm font-medium text-white line-clamp-1">
                      {goal.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-white ml-2">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: goal.color,
                    }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
