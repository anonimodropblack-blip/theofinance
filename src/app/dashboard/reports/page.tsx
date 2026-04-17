'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: string
  description?: string
}

interface ReportData {
  totalIncome: number
  totalExpense: number
  net: number
  transactionCount: number
  byCategory: Record<string, number>
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    // Set default date range (current month)
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    setFromDate(firstDay.toISOString().split('T')[0])
    setToDate(lastDay.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (fromDate && toDate) {
      loadReport()
    }
  }, [fromDate, toDate])

  const loadReport = async () => {
    try {
      setLoading(true)

      const query = `/api/transactions?fromDate=${fromDate}&toDate=${toDate}`
      const response = await fetch(query)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load transactions')
      }

      const transactions: Transaction[] = data.transactions || []

      // Calculate report
      let totalIncome = 0
      let totalExpense = 0

      transactions.forEach((t) => {
        if (t.type === 'income') {
          totalIncome += t.amount
        } else if (t.type === 'expense') {
          totalExpense += t.amount
        }
      })

      setReport({
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        transactionCount: transactions.length,
        byCategory: {},
      })

      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Relatórios</h2>

      {/* Date Range */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            De
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Até
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <div className="p-6 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-slate-400 text-sm font-medium mb-2">RECEITA TOTAL</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(report.totalIncome)}
            </p>
          </div>

          {/* Total Expense */}
          <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-slate-400 text-sm font-medium mb-2">DESPESA TOTAL</p>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(report.totalExpense)}
            </p>
          </div>

          {/* Net */}
          <div
            className={`p-6 rounded-lg border ${
              report.net >= 0
                ? 'bg-blue-900/20 border-blue-500/30'
                : 'bg-orange-900/20 border-orange-500/30'
            }`}
          >
            <p className="text-slate-400 text-sm font-medium mb-2">SALDO</p>
            <p
              className={`text-2xl font-bold ${
                report.net >= 0 ? 'text-blue-400' : 'text-orange-400'
              }`}
            >
              {formatCurrency(report.net)}
            </p>
          </div>

          {/* Transaction Count */}
          <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-slate-400 text-sm font-medium mb-2">
              TRANSAÇÕES
            </p>
            <p className="text-2xl font-bold text-white">
              {report.transactionCount}
            </p>
          </div>
        </div>
      ) : null}

      {/* Summary Text */}
      {report && (
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Resumo do Período</h3>
          <div className="space-y-2 text-slate-300">
            <p>
              Durante este período, você teve{' '}
              <span className="font-semibold text-white">
                {report.transactionCount}
              </span>{' '}
              transações.
            </p>
            <p>
              Receita total:{' '}
              <span className="font-semibold text-green-400">
                {formatCurrency(report.totalIncome)}
              </span>
            </p>
            <p>
              Despesa total:{' '}
              <span className="font-semibold text-red-400">
                {formatCurrency(report.totalExpense)}
              </span>
            </p>
            <p>
              Saldo:{' '}
              <span
                className={`font-semibold ${
                  report.net >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(report.net)}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
