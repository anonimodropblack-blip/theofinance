'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { DueBill } from '@/types'

interface DueBillCardProps {
  bill: DueBill
  onMarkAsPaid: (bill: DueBill) => void
  onEdit: (bill: DueBill) => void
  onDelete: (id: string) => void
}

const statusStyles: Record<string, string> = {
  pending: 'bg-[var(--gold-subtle)] text-[var(--gold)]',
  paid: 'bg-[var(--success-subtle)] text-[var(--success)]',
  overdue: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
  cancelled: 'bg-[var(--bg)] text-[var(--text-subtle)] border border-[var(--border)]',
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

  const daysUntilDue = bill.daysUntilDue ?? 0
  const daysText = daysUntilDue === 0
    ? 'Vence hoje'
    : daysUntilDue === 1
    ? 'Vence amanhã'
    : daysUntilDue > 0
    ? `Vence em ${daysUntilDue} dias`
    : `Venceu há ${Math.abs(daysUntilDue)} dias`

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text)] mb-1 truncate">{bill.title}</h3>
          {bill.category && (
            <span className="text-xs bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full inline-block">
              {bill.category}
            </span>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusStyles[bill.status]}`}>
          {statusLabels[bill.status]}
        </span>
      </div>

      {bill.description && (
        <p className="text-xs text-[var(--text-subtle)] mb-3">{bill.description}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-semibold text-[var(--text)] tabular-nums">{formatCurrency(bill.amount)}</p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            {formatDate(bill.due_date)} · {daysText}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {bill.status === 'pending' && (
          <button
            onClick={() => onMarkAsPaid(bill)}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-[var(--success-subtle)] hover:bg-[var(--success)] hover:text-white text-[var(--success)] px-3 py-2 text-sm font-medium transition-colors"
          >
            Marcar pago
          </button>
        )}
        <button
          onClick={() => onEdit(bill)}
          className="p-2 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (confirm('Tem certeza?')) onDelete(bill.id)
          }}
          className="p-2 rounded-lg text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
          aria-label="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
