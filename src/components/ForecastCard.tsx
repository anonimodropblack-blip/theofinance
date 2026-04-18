'use client'

import { BarChart3 } from 'lucide-react'

interface ForecastCardProps {
  averageMonthlyExpense: number
  averageDailyExpense: number
  totalForecast30Days: number
}

export default function ForecastCard({
  averageMonthlyExpense,
  averageDailyExpense,
  totalForecast30Days,
}: ForecastCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--text)]">Previsão de gastos</h3>
        <div className="h-9 w-9 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center">
          <BarChart3 className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-[var(--bg)]">
          <p className="text-sm text-[var(--text-muted)]">Média mensal (últimos 3 meses)</p>
          <p className="text-2xl font-semibold text-[var(--danger)] mt-1 tabular-nums">
            {formatCurrency(averageMonthlyExpense)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg)]">
          <p className="text-sm text-[var(--text-muted)]">Média diária</p>
          <p className="text-xl font-semibold text-[var(--text)] mt-1 tabular-nums">
            {formatCurrency(averageDailyExpense)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[color:rgba(239,68,68,0.25)] bg-[var(--danger-subtle)]">
          <p className="text-sm text-[var(--text-muted)]">Previsão próximos 30 dias</p>
          <p className="text-2xl font-semibold text-[var(--danger)] mt-1 tabular-nums">
            {formatCurrency(totalForecast30Days)}
          </p>
        </div>
      </div>

      <p className="text-xs text-[var(--text-subtle)] mt-4">
        Baseado na média dos últimos 3 meses
      </p>
    </div>
  )
}
