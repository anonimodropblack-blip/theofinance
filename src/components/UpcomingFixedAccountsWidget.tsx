'use client'

import Link from 'next/link'
import type { FixedAccount } from '@/types'

interface UpcomingFixedAccountsWidgetProps {
  accounts: FixedAccount[]
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

export default function UpcomingFixedAccountsWidget({ accounts }: UpcomingFixedAccountsWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const activeAccounts = accounts.filter((a) => a.is_active)
  const totalMonthly = activeAccounts
    .filter((a) => a.frequency === 'monthly')
    .reduce((sum, a) => sum + a.amount, 0)

  // Get top 3 by due date
  const upcoming = activeAccounts.slice(0, 3)

  if (activeAccounts.length === 0) {
    return null
  }

  return (
    <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Contas Fixas</h3>
        <Link href="/dashboard/fixed-accounts" className="text-rose-500 hover:text-rose-400 text-sm">
          Ver todas →
        </Link>
      </div>

      <div className="mb-4 p-3 bg-slate-900/50 rounded">
        <p className="text-xs text-slate-400">Total Mensal</p>
        <p className="text-2xl font-bold text-white">{formatCurrency(totalMonthly)}</p>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 mb-3">Próximas</p>
          {upcoming.map((account) => (
            <div
              key={account.id}
              className="p-3 bg-slate-900/50 rounded flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{account.name}</p>
                <p className="text-xs text-slate-400">{frequencyLabels[account.frequency]}</p>
              </div>
              <p className="text-sm font-bold text-rose-400">{formatCurrency(account.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
