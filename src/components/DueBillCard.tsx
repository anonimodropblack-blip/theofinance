'use client'

import type { DueBill } from '@/types'

interface DueBillCardProps {
  bill: DueBill
  onMarkAsPaid: (bill: DueBill) => void
  onEdit: (bill: DueBill) => void
  onDelete: (id: string) => void
}

const statusStyles = {
  pending: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300',
  paid: 'bg-green-900/20 border-green-500/30 text-green-300',
  overdue: 'bg-red-900/20 border-red-500/30 text-red-300',
  cancelled: 'bg-slate-700 border-slate-600 text-slate-400',
}

const statusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
}

export default function DueBillCard({
  bill,
  onMarkAsPaid,
  onEdit,
  onDelete,
}: DueBillCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const daysText = bill.daysUntilDue === 0
    ? 'Vence hoje'
    : bill.daysUntilDue === 1
    ? 'Vence amanhã'
    : bill.daysUntilDue > 0
    ? `Vence em ${bill.daysUntilDue} dias`
    : `Venceu há ${Math.abs(bill.daysUntilDue)} dias`

  return (
    <div className={`p-4 border rounded-lg ${statusStyles[bill.status]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{bill.title}</h3>
          {bill.category && (
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded inline-block">
              {bill.category}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded font-medium ${statusStyles[bill.status]}`}>
          {statusLabels[bill.status]}
        </span>
      </div>

      {bill.description && (
        <p className="text-xs text-slate-400 mb-3">{bill.description}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-white">{formatCurrency(bill.amount)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {formatDate(bill.due_date)} • {daysText}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {bill.status === 'pending' && (
          <button
            onClick={() => onMarkAsPaid(bill)}
            className="flex-1 px-3 py-2 bg-green-900/30 hover:bg-green-900/50 text-green-300 rounded text-sm font-medium transition-colors"
          >
            Marcar Pago
          </button>
        )}
        <button
          onClick={() => onEdit(bill)}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm('Tem certeza?')) {
              onDelete(bill.id)
            }
          }}
          className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded text-sm transition-colors"
        >
          Deletar
        </button>
      </div>
    </div>
  )
}
