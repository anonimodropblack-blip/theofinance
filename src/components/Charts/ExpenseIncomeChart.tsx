'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartDataPoint {
  name: string
  income: number
  expense: number
}

interface ExpenseIncomeChartProps {
  data: ChartDataPoint[]
  height?: number
}

export default function ExpenseIncomeChart({
  data,
  height = 300,
}: ExpenseIncomeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value) =>
            new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value as number)
          }
        />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" name="Receita" radius={[8, 8, 0, 0]} />
        <Bar
          dataKey="expense"
          fill="#ef4444"
          name="Despesa"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
