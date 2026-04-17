'use client'

import Link from 'next/link'
import type { DueBill } from '@/types'

interface UpcomingDueBillsWidgetProps {
  bills: DueBill[]
}

export default function UpcomingDueBillsWidget({ bills }: UpcomingDueBillsWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const overdueBills = bills.filter((b) => b.isOverdue)
  const pendingBills = bills.filter((b) => b.status === 'pending')
  const upcomingBills = pendingBills.slice(0, 3)
  const totalDue = pendingBills.reduce((sum, b) => sum + b.amount, 0)

  if (bills.length === 0) {
    return null
  }

  return (
    <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Contas a Vencer 📋</h3>
        <Link href="/dashboard/due-bills" className="text-rose-500 hover:text-rose-400 text-sm">
          Ver todas →
        </Link>
      </div>

      {/* Alerts */}
      {overdueBills.length > 0 && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-xs text-red-300 font-medium">
            ⚠️ {overdueBills.length} conta{overdueBills.length > 1 ? 's' : ''} vencida{overdueBills.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mb-4 p-3 bg-slate-900/50 rounded">
        <p className="text-xs text-slate-400">Total a Pagar</p>
        <p className="text-2xl font-bold text-white">{formatCurrency(totalDue)}</p>
      </div>

      {/* Upcoming */}
      {upcomingBills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 mb-2">Próximas</p>
          {upcomingBills.map((bill) => {
            const daysText = bill.daysUntilDue === 0
              ? 'Hoje'
              : bill.daysUntilDue === 1
              ? 'Amanhã'
              : `Em ${bill.daysUntilDue}d`

            return (
              <div
                key={bill.id}
                className={`p-2 rounded flex items-center justify-between text-sm ${
                  bill.isOverdue
                    ? 'bg-red-900/20 border-l-2 border-red-500'
                    : bill.daysUntilDue === 0
                    ? 'bg-yellow-900/20 border-l-2 border-yellow-500'
                    : 'bg-slate-900/50'
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-white line-clamp-1">{bill.title}</p>
                  <p className="text-xs text-slate-400">{daysText}</p>
                </div>
                <p className="text-sm font-bold text-white ml-2">
                  {formatCurrency(bill.amount)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
