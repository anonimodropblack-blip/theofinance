'use client'

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

const frequencyColors: Record<string, string> = {
  weekly: 'bg-blue-900/20 border-blue-500/30',
  biweekly: 'bg-purple-900/20 border-purple-500/30',
  monthly: 'bg-pink-900/20 border-pink-500/30',
  bimonthly: 'bg-orange-900/20 border-orange-500/30',
  quarterly: 'bg-green-900/20 border-green-500/30',
  yearly: 'bg-indigo-900/20 border-indigo-500/30',
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

  return (
    <div
      className={`p-4 border rounded-lg transition-opacity ${
        account.is_active
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-slate-800/30 border-slate-700/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white">{account.name}</h3>
            {account.category && (
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {account.category}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{account.description}</p>
        </div>

        <button
          onClick={() => onToggle(account.id, !account.is_active)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            account.is_active
              ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {account.is_active ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-rose-400">
            {formatCurrency(account.amount)}
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium border ${
              frequencyColors[account.frequency]
            }`}
          >
            {frequencyLabels[account.frequency]}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(account)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => {
              if (confirm('Tem certeza?')) {
                onDelete(account.id)
              }
            }}
            className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded text-xs transition-colors"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  )
}
