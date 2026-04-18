'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Wallet,
  TrendingUp,
  MessageCircle,
  CalendarDays,
  Target,
  PiggyBank,
  BarChart3,
  CircleDollarSign,
  Users,
} from 'lucide-react'
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
  investmentsCount?: number
  totalInvested?: number
  totalInvestmentsCurrent?: number
  investmentsProfit?: number
  netWorth?: number
}

interface Forecast {
  averageMonthlyExpense: number
  averageDailyExpense: number
  totalForecast30Days: number
  basedOnMonths: number
  dailyForecast: Array<{ date: string; expectedExpense: number }>
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
  const [viewMode, setViewMode] = useState<'primary' | 'secondary' | 'couple'>('couple')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

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

        const { data: coupleData } = await supabase
          .from('couples')
          .select('*')
          .or(`primary_user_id.eq.${authData.user.id},secondary_user_id.eq.${authData.user.id}`)
          .single()

        if (coupleData) setCouple(coupleData)
        setLoading(false)
      } catch (err) {
        console.error('Load session error:', err)
        setLoading(false)
      }
    }
    loadSession()
  }, [router])

  useEffect(() => {
    if (!loading) loadDashboardData()
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

      if (favRes.ok) setFavorites((await favRes.json()).favorites || [])
      if (sumRes.ok) setSummary((await sumRes.json()).summary)
      if (foreRes.ok) setForecast((await foreRes.json()).forecast)
      if (fixedRes.ok) setFixedAccounts((await fixedRes.json()).fixedAccounts || [])
      if (savingsRes.ok) setSavingsGoals((await savingsRes.json()).savingsGoals || [])
      if (billsRes.ok) setDueBills((await billsRes.json()).dueBills || [])
    } catch (err) {
      console.error('Load dashboard data error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm">
        Carregando dashboard…
      </div>
    )
  }

  if (!user || !couple) {
    return (
      <div className="text-[var(--text-muted)]">
        Não foi possível carregar seus dados.{' '}
        <Link href="/auth/login" className="text-[var(--primary)] underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  const primaryLabel = couple.primary_user_email.split('@')[0]
  const secondaryLabel = couple.secondary_user_email?.split('@')[0]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Greeting + view mode */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Olá, {primaryLabel}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Aqui está o panorama financeiro{' '}
            {viewMode === 'couple' ? 'do casal' : 'individual'} de hoje.
          </p>
        </div>

        {couple.secondary_user_id && (
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
            {[
              { id: 'couple', label: 'Casal', Icon: Users },
              { id: 'primary', label: primaryLabel, Icon: null },
              { id: 'secondary', label: secondaryLabel ?? 'Parceiro(a)', Icon: null },
            ].map((opt) => {
              const active = viewMode === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setViewMode(opt.id as typeof viewMode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {opt.Icon && <opt.Icon className="h-3.5 w-3.5" />}
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Receita</p>
              <div className="h-8 w-8 rounded-lg bg-[var(--success-subtle)] flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-[var(--success)]" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[var(--success)] tabular-nums">
              {formatBRL(summary.totalIncome)}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Despesa</p>
              <div className="h-8 w-8 rounded-lg bg-[var(--danger-subtle)] flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-[var(--danger)]" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[var(--danger)] tabular-nums">
              {formatBRL(summary.totalExpense)}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Saldo</p>
              <div className="h-8 w-8 rounded-lg bg-[var(--primary-subtle)] flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
              </div>
            </div>
            <p
              className={`text-2xl font-semibold tabular-nums ${
                summary.net >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'
              }`}
            >
              {formatBRL(summary.net)}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Patrimônio total</p>
              <div className="h-8 w-8 rounded-lg bg-[var(--gold-subtle)] flex items-center justify-center">
                <Wallet className="h-4 w-4 text-[var(--gold)]" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[var(--text)] tabular-nums">
              {formatBRL(summary.netWorth ?? summary.totalAccountsBalance)}
            </p>
            {summary.totalInvestmentsCurrent ? (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {formatBRL(summary.totalInvestmentsCurrent)} aplicados
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Forecast */}
      {forecast && (
        <ForecastCard
          averageMonthlyExpense={forecast.averageMonthlyExpense}
          averageDailyExpense={forecast.averageDailyExpense}
          totalForecast30Days={forecast.totalForecast30Days}
        />
      )}

      {/* Widgets */}
      {(fixedAccounts.length > 0 || savingsGoals.length > 0 || dueBills.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fixedAccounts.length > 0 && <UpcomingFixedAccountsWidget accounts={fixedAccounts} />}
          {savingsGoals.length > 0 && <SavingsGoalsWidget goals={savingsGoals} />}
          {dueBills.length > 0 && <UpcomingDueBillsWidget bills={dueBills} />}
        </div>
      )}

      {/* Favoritos */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text)]">Contas favoritas</h3>
            <Link
              href="/dashboard/contas"
              className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-medium"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <Link
                key={fav.id}
                href={`/dashboard/contas/${fav.accounts.id}`}
                className="card card-hover p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-[var(--text)]">{fav.accounts.name}</h4>
                    <p className="text-xs text-[var(--text-subtle)] mt-0.5">{fav.accounts.type}</p>
                  </div>
                  <div
                    className="w-8 h-1 rounded-full"
                    style={{ backgroundColor: fav.accounts.color }}
                  />
                </div>
                <p className="text-2xl font-semibold text-[var(--text)] tabular-nums">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: fav.accounts.currency || 'BRL',
                  }).format(fav.accounts.balance || 0)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Ações rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href: '/dashboard/contas', Icon: Wallet, label: 'Contas' },
            { href: '/dashboard/transacoes', Icon: CircleDollarSign, label: 'Transações' },
            { href: '/dashboard/relatorios', Icon: BarChart3, label: 'Relatórios' },
            { href: '/dashboard/calendario', Icon: CalendarDays, label: 'A vencer' },
            { href: '/dashboard/contas-fixas', Icon: CircleDollarSign, label: 'Contas fixas' },
            { href: '/dashboard/objetivos', Icon: Target, label: 'Caixinhas' },
            { href: '/dashboard/chat', Icon: MessageCircle, label: 'Chat IA' },
            { href: '/dashboard/dividas', Icon: PiggyBank, label: 'Dívidas' },
          ].map(({ href, Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="card card-hover p-4 flex flex-col items-center gap-2 text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <p className="text-sm font-medium text-[var(--text)]">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
