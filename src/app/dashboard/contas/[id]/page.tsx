'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { ArrowLeft, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { Account } from '@/types'

export default function AccountDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const [accountRes, transRes] = await Promise.all([
        fetch(`/api/accounts/${params.id}`),
        fetch(`/api/transactions?accountId=${params.id}`),
      ])

      const accountData = await accountRes.json()
      const transData = await transRes.json()

      if (!accountRes.ok) {
        throw new Error(accountData.error || 'Account not found')
      }

      setAccount(accountData.account)
      setTransactions(transData.transactions || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const typeLabels: Record<string, string> = {
    checking: 'Conta corrente',
    savings: 'Poupança',
    credit: 'Cartão de crédito',
    cash: 'Dinheiro',
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Link
          href="/dashboard/contas"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <p className="text-sm text-[var(--text-muted)]">Carregando...</p>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Link
          href="/dashboard/contas"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="p-4 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30">
          <p className="text-sm text-[var(--danger)]">{error || 'Conta não encontrada'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link
        href="/dashboard/contas"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Contas
      </Link>

      {/* Account Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{account.name}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">{typeLabels[account.type] ?? account.type}</p>
          </div>
          <div
            className="w-12 h-12 rounded-xl shrink-0"
            style={{ backgroundColor: account.color }}
          />
        </div>

        <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-1">Saldo atual</p>
        <div className="text-4xl font-semibold text-[var(--text)] tabular-nums">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: account.currency || 'BRL',
          }).format(account.balance || 0)}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Transações</h2>

        {transactions.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhuma transação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction: any) => {
              const isIncome = transaction.type === 'income'
              return (
                <div
                  key={transaction.id}
                  className="card p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        isIncome
                          ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                          : 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text)]">
                        {transaction.description || 'Transação'}
                      </p>
                      <p className="text-xs text-[var(--text-subtle)]">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`text-lg font-semibold tabular-nums ${
                      isIncome ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(transaction.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
