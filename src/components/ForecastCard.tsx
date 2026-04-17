'use client'

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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Previsão de Gastos</h3>
        <span className="text-2xl">📊</span>
      </div>

      <div className="space-y-4">
        {/* Média Mensal */}
        <div className="p-3 bg-slate-900/50 rounded-lg">
          <p className="text-sm text-slate-400">Média Mensal (últimos 3 meses)</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">
            {formatCurrency(averageMonthlyExpense)}
          </p>
        </div>

        {/* Média Diária */}
        <div className="p-3 bg-slate-900/50 rounded-lg">
          <p className="text-sm text-slate-400">Média Diária</p>
          <p className="text-xl font-semibold text-slate-200 mt-1">
            {formatCurrency(averageDailyExpense)}
          </p>
        </div>

        {/* Previsão 30 dias */}
        <div className="p-3 bg-gradient-to-r from-rose-900/30 to-rose-800/20 border border-rose-700/30 rounded-lg">
          <p className="text-sm text-slate-400">Previsão Próximos 30 Dias</p>
          <p className="text-2xl font-bold text-rose-300 mt-1">
            {formatCurrency(totalForecast30Days)}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Baseado na média dos últimos 3 meses
      </p>
    </div>
  )
}
