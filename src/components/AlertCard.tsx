'use client'

import { AlertTriangle, TrendingDown, Bell, type LucideIcon } from 'lucide-react'

interface AlertCardProps {
  type: 'low_balance' | 'high_expense' | 'unusual_activity'
  accountName: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

const severityStyles: Record<AlertCardProps['severity'], string> = {
  info: 'border-[color:rgba(59,130,246,0.30)] bg-[var(--primary-subtle)] text-[var(--text)]',
  warning: 'border-[color:rgba(250,204,21,0.35)] bg-[var(--gold-subtle)] text-[var(--text)]',
  critical: 'border-[color:rgba(239,68,68,0.35)] bg-[var(--danger-subtle)] text-[var(--text)]',
}

const iconColor: Record<AlertCardProps['severity'], string> = {
  info: 'var(--primary)',
  warning: 'var(--gold)',
  critical: 'var(--danger)',
}

const icons: Record<AlertCardProps['type'], LucideIcon> = {
  low_balance: AlertTriangle,
  high_expense: TrendingDown,
  unusual_activity: Bell,
}

export default function AlertCard({
  type,
  accountName,
  message,
  severity,
}: AlertCardProps) {
  const Icon = icons[type]
  return (
    <div className={`p-4 border rounded-2xl ${severityStyles[severity]}`}>
      <div className="flex items-start gap-3">
        <Icon
          className="h-5 w-5 shrink-0 mt-0.5"
          style={{ color: iconColor[severity] }}
          strokeWidth={2}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{accountName}</p>
          <p className="text-sm mt-1 text-[var(--text-muted)]">{message}</p>
        </div>
      </div>
    </div>
  )
}
