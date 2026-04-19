'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { FixedAccount } from '@/types'

interface FixedAccountCardProps {
  account: FixedAccount
  onEdit: (account: FixedAccount) => void
  onDelete: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

export default function FixedAccountCard({
  account,
  onEdit,
  onDelete,
  onToggle,
}: FixedAccountCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const isIncome = account.type === 'income'

  return (
    <div className={`card p-4 ${!account.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-[var(--text)] truncate">{account.name}</h3>
            {account.category && (
              <span className="text-xs bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                {account.category}
              </span>
            )}
          </div>
          {account.description && (
            <p className="text-xs text-[var(--text-subtle)] truncate">{account.description}</p>
          )}
        </div>

        <button
          onClick={() => onToggle(account.id, !account.is_active)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
            account.is_active
              ? 'bg-[var(--success-subtle)] text-[var(--success)] hover:opacity-80'
              : 'bg-[var(--bg)] text-[var(--text-subtle)] border border-[var(--border)] hover:text-[var(--text)]'
          }`}
        >
          {account.is_active ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-semibold tabular-nums ${isIncome ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {formatCurrency(account.amount)}
          </div>
          <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--primary-subtle)] text-[var(--primary)]">
            {frequencyLabels[account.frequency]}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Tem certeza?')) onDelete(account.id)
            }}
            className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
            aria-label="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
