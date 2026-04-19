'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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

  const upcoming = activeAccounts.slice(0, 3)

  if (activeAccounts.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text)]">Contas fixas</h3>
        <Link
          href="/dashboard/contas-fixas"
          className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-medium"
        >
          Ver todas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mb-4 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
        <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Total mensal</p>
        <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-1">{formatCurrency(totalMonthly)}</p>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-2">Próximas</p>
          {upcoming.map((account) => (
            <div
              key={account.id}
              className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">{account.name}</p>
                <p className="text-xs text-[var(--text-subtle)]">{frequencyLabels[account.frequency]}</p>
              </div>
              <p className="text-sm font-semibold text-[var(--danger)] tabular-nums">{formatCurrency(account.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
