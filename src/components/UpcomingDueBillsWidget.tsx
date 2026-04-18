'use client'

import Link from 'next/link'
import { ArrowRight, AlertTriangle, CalendarDays } from 'lucide-react'
import type { DueBill } from '@/types'

interface UpcomingDueBillsWidgetProps {
  bills: DueBill[]
}

export default function UpcomingDueBillsWidget({ bills }: UpcomingDueBillsWidgetProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const overdueBills = bills.filter((b) => b.isOverdue)
  const pendingBills = bills.filter((b) => b.status === 'pending')
  const upcomingBills = pendingBills.slice(0, 3)
  const totalDue = pendingBills.reduce((sum, b) => sum + b.amount, 0)

  if (bills.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text)]">Contas a vencer</h3>
        </div>
        <Link
          href="/dashboard/calendario"
          className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-medium"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {overdueBills.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-[color:rgba(239,68,68,0.30)] bg-[var(--danger-subtle)] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
          <p className="text-sm text-[var(--text)]">
            {overdueBills.length} conta{overdueBills.length > 1 ? 's' : ''} vencida
            {overdueBills.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="mb-4 p-4 rounded-xl bg-[var(--bg)]">
        <p className="text-xs text-[var(--text-subtle)]">Total a pagar</p>
        <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-1">
          {formatCurrency(totalDue)}
        </p>
      </div>

      {upcomingBills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-2">
            Próximas
          </p>
          {upcomingBills.map((bill) => {
            const daysText = bill.daysUntilDue === 0
              ? 'Hoje'
              : bill.daysUntilDue === 1
                ? 'Amanhã'
                : `Em ${bill.daysUntilDue} dias`

            const accent = bill.isOverdue
              ? 'border-l-[var(--danger)]'
              : bill.daysUntilDue === 0
                ? 'border-l-[var(--gold)]'
                : 'border-l-[var(--border-strong)]'

            return (
              <div
                key={bill.id}
                className={`p-3 rounded-xl flex items-center justify-between text-sm bg-[var(--bg)] border-l-2 ${accent}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{bill.title}</p>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">{daysText}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--text)] ml-2 tabular-nums">
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
