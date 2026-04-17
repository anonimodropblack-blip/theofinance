'use client'

interface AlertCardProps {
  type: 'low_balance' | 'high_expense' | 'unusual_activity'
  accountName: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

const severityStyles = {
  info: 'bg-blue-900/20 border-blue-500/30 text-blue-200',
  warning: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-200',
  critical: 'bg-red-900/20 border-red-500/30 text-red-200',
}

const icons = {
  low_balance: '⚠️',
  high_expense: '💸',
  unusual_activity: '🔔',
}

export default function AlertCard({
  type,
  accountName,
  message,
  severity,
}: AlertCardProps) {
  return (
    <div className={`p-4 border rounded-lg ${severityStyles[severity]}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{icons[type]}</span>
        <div className="flex-1">
          <p className="font-medium">{accountName}</p>
          <p className="text-sm mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}
