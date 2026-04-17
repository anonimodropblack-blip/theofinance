'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
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

  const typeLabels = {
    checking: 'Conta Corrente',
    savings: 'Poupança',
    credit: 'Cartão de Crédito',
    cash: 'Dinheiro',
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/accounts"
          className="text-rose-500 hover:text-rose-400"
        >
          ← Voltar
        </Link>
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/accounts"
          className="text-rose-500 hover:text-rose-400"
        >
          ← Voltar
        </Link>
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-200">{error || 'Account not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/accounts"
        className="text-rose-500 hover:text-rose-400"
      >
        ← Voltar para Contas
      </Link>

      {/* Account Header */}
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{account.name}</h1>
            <p className="text-slate-400 mt-1">
              {typeLabels[account.type]}
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-lg"
            style={{ backgroundColor: account.color }}
          ></div>
        </div>

        <div className="text-4xl font-bold text-white">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: account.currency || 'BRL',
          }).format(account.balance || 0)}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Transações</h2>

        {transactions.length === 0 ? (
          <div className="p-6 text-center bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-slate-400">Nenhuma transação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction: any) => (
              <div
                key={transaction.id}
                className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {transaction.description || 'Transação'}
                  </p>
                  <p className="text-sm text-slate-400">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div
                  className={`text-lg font-semibold ${
                    transaction.type === 'income'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
