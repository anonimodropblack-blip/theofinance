'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Couple, User, FixedAccount, SavingsGoal, DueBill } from '@/types'
import ForecastCard from '@/components/ForecastCard'
import UpcomingFixedAccountsWidget from '@/components/UpcomingFixedAccountsWidget'
import SavingsGoalsWidget from '@/components/SavingsGoalsWidget'
import UpcomingDueBillsWidget from '@/components/UpcomingDueBillsWidget'

interface Favorite {
  id: string
  account_id: string
  accounts: {
    id: string
    name: string
    type: string
    balance: number
    color: string
    currency: string
  }
}

interface Summary {
  period: string
  totalIncome: number
  totalExpense: number
  net: number
  transactionCount: number
  accountsCount: number
  totalAccountsBalance: number
}

interface Forecast {
  averageMonthlyExpense: number
  averageDailyExpense: number
  totalForecast30Days: number
  basedOnMonths: number
  dailyForecast: Array<{
    date: string
    expectedExpense: number
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [fixedAccounts, setFixedAccounts] = useState<FixedAccount[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [dueBills, setDueBills] = useState<DueBill[]>([])
  const [viewMode, setViewMode] = useState<'primary' | 'secondary'>('primary')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        // Get current user
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError || !authData.user) {
          router.push('/auth/login')
          return
        }

        setUser({
          id: authData.user.id,
          email: authData.user.email || '',
          email_confirmed_at: authData.user.email_confirmed_at,
          created_at: authData.user.created_at,
        })

        // Get couple info
        const { data: coupleData, error: coupleError } = await supabase
          .from('couples')
          .select('*')
          .or(`primary_user_id.eq.${authData.user.id},secondary_user_id.eq.${authData.user.id}`)
          .single()

        if (coupleError) {
          setError('Failed to load couple data')
          return
        }

        setCouple(coupleData)

        // Set view mode based on user role
        if (coupleData.primary_user_id === authData.user.id) {
          setViewMode('primary')
        } else {
          setViewMode('secondary')
        }

        setLoading(false)
      } catch (err) {
        console.error('Load session error:', err)
        setError('An error occurred')
        setLoading(false)
      }
    }

    loadSession()
  }, [router])

  // Load favorites and summary
  useEffect(() => {
    if (!loading) {
      loadDashboardData()
    }
  }, [loading])

  const loadDashboardData = async () => {
    try {
      const [favRes, sumRes, foreRes, fixedRes, savingsRes, billsRes] = await Promise.all([
        fetch('/api/favorites'),
        fetch('/api/dashboard/summary'),
        fetch('/api/dashboard/forecast'),
        fetch('/api/fixed-accounts'),
        fetch('/api/savings-goals'),
        fetch('/api/due-bills'),
      ])

      const favData = await favRes.json()
      const sumData = await sumRes.json()
      const foreData = await foreRes.json()
      const fixedData = await fixedRes.json()
      const savingsData = await savingsRes.json()
      const billsData = await billsRes.json()

      if (favRes.ok) {
        setFavorites(favData.favorites || [])
      }

      if (sumRes.ok) {
        setSummary(sumData.summary)
      }

      if (foreRes.ok) {
        setForecast(foreData.forecast)
      }

      if (fixedRes.ok) {
        setFixedAccounts(fixedData.fixedAccounts || [])
      }

      if (savingsRes.ok) {
        setSavingsGoals(savingsData.savingsGoals || [])
      }

      if (billsRes.ok) {
        setDueBills(billsData.dueBills || [])
      }
    } catch (err) {
      console.error('Load dashboard data error:', err)
    }
  }

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (error || !user || !couple) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-200 mb-4">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            Theo<span className="text-rose-500">Finance</span>
          </h1>

          <div className="flex items-center gap-6">
            {/* View Mode Toggle */}
            {couple.secondary_user_id && (
              <div className="flex items-center gap-3 bg-slate-700 rounded-lg p-2">
                <button
                  onClick={() => setViewMode('primary')}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === 'primary'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {couple.primary_user_email.split('@')[0]}
                </button>
                <div className="w-px h-6 bg-slate-600"></div>
                <button
                  onClick={() => setViewMode('secondary')}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === 'secondary'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {couple.secondary_user_email?.split('@')[0] || 'Partner'}
                </button>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card */}
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bem-vindo de volta!
          </h2>
          <p className="text-slate-400">
            Visualizando como <span className="text-rose-500 font-medium">
              {viewMode === 'primary' ? couple?.primary_user_email : couple?.secondary_user_email || 'Partner'}
            </span>
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-slate-400 text-sm font-medium mb-2">RECEITA</p>
              <p className="text-2xl font-bold text-green-400">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(summary.totalIncome)}
              </p>
            </div>

            <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-slate-400 text-sm font-medium mb-2">DESPESA</p>
              <p className="text-2xl font-bold text-red-400">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(summary.totalExpense)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              summary.net >= 0
                ? 'bg-blue-900/20 border-blue-500/30'
                : 'bg-orange-900/20 border-orange-500/30'
            }`}>
              <p className="text-slate-400 text-sm font-medium mb-2">SALDO</p>
              <p className={`text-2xl font-bold ${
                summary.net >= 0 ? 'text-blue-400' : 'text-orange-400'
              }`}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(summary.net)}
              </p>
            </div>

            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm font-medium mb-2">TOTAL CONTAS</p>
              <p className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(summary.totalAccountsBalance)}
              </p>
            </div>
          </div>
        )}

        {/* Forecast Card */}
        {forecast && (
          <ForecastCard
            averageMonthlyExpense={forecast.averageMonthlyExpense}
            averageDailyExpense={forecast.averageDailyExpense}
            totalForecast30Days={forecast.totalForecast30Days}
          />
        )}

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fixedAccounts.length > 0 && (
            <UpcomingFixedAccountsWidget accounts={fixedAccounts} />
          )}
          {savingsGoals.length > 0 && (
            <SavingsGoalsWidget goals={savingsGoals} />
          )}
          {dueBills.length > 0 && (
            <UpcomingDueBillsWidget bills={dueBills} />
          )}
        </div>

        {/* Favorite Accounts */}
        {favorites && favorites.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Contas Favoritas</h3>
              <Link href="/dashboard/accounts" className="text-rose-500 hover:text-rose-400 text-sm">
                Ver todas →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => (
                <Link
                  key={fav.id}
                  href={`/dashboard/accounts/${fav.accounts.id}`}
                  className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-rose-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{fav.accounts.name}</h4>
                      <p className="text-xs text-slate-400">{fav.accounts.type}</p>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: fav.accounts.color }}
                    ></div>
                  </div>
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-2xl font-bold text-white">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: fav.accounts.currency || 'BRL',
                      }).format(fav.accounts.balance || 0)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/dashboard/accounts"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">🏦</p>
              <p className="font-medium text-white">Contas</p>
            </Link>
            <Link
              href="/dashboard/transactions"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">💰</p>
              <p className="font-medium text-white">Transações</p>
            </Link>
            <Link
              href="/dashboard/reports"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">📈</p>
              <p className="font-medium text-white">Relatórios</p>
            </Link>
            <Link
              href="/dashboard/due-bills"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">⏰</p>
              <p className="font-medium text-white">A Vencer</p>
            </Link>
            <Link
              href="/dashboard/fixed-accounts"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-medium text-white">Contas Fixas</p>
            </Link>
            <Link
              href="/dashboard/savings-goals"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">🎯</p>
              <p className="font-medium text-white">Caixinhas</p>
            </Link>
            <Link
              href="/dashboard/settings"
              className="p-4 bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-lg transition-colors text-center"
            >
              <p className="text-2xl mb-2">⚙️</p>
              <p className="font-medium text-white">Configurações</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
