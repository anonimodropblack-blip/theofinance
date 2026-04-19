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
  Plus,
  Building2,
  Sparkles,
} from 'lucide-react'
import type { Couple, User, FixedAccount, SavingsGoal, DueBill } from '@/types'
import type { FeedItem } from '@/app/api/feed/route'
import FeedList from '@/components/FeedList'
import ForecastCard from '@/components/ForecastCard'
import UpcomingFixedAccountsWidget from '@/components/UpcomingFixedAccountsWidget'
import SavingsGoalsWidget from '@/components/SavingsGoalsWidget'
import UpcomingDueBillsWidget from '@/components/UpcomingDueBillsWidget'
import { useQuickRegister } from '@/components/QuickRegisterContext'

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
  imoveisCount?: number
  imoveisAtivosCount?: number
  totalPatrimonioImoveis?: number
  rendaAluguelBruta?: number
  rendaAluguelLiquida?: number
}

interface Forecast {
  averageMonthlyExpense: number
  averageDailyExpense: number
  totalForecast30Days: number
  basedOnMonths: number
  dailyForecast: Array<{ date: string; expectedExpense: number }>
}

interface FeedCouple {
  primaryId?: string
  secondaryId?: string
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function firstDayOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const router = useRouter()
  const qr = useQuickRegister()
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [fixedAccounts, setFixedAccounts] = useState<FixedAccount[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [dueBills, setDueBills] = useState<DueBill[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedCouple, setFeedCouple] = useState<FeedCouple>({})
  const [feedLoading, setFeedLoading] = useState(true)
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

  useEffect(() => {
    if (!loading) loadFeed()
  }, [loading, qr.bump])

  const loadDashboardData = async () => {
    try {
      const [sumRes, foreRes, fixedRes, savingsRes, billsRes] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/dashboard/forecast'),
        fetch('/api/fixed-accounts'),
        fetch('/api/savings-goals'),
        fetch('/api/due-bills'),
      ])

      if (sumRes.ok) setSummary((await sumRes.json()).summary)
      if (foreRes.ok) setForecast((await foreRes.json()).forecast)
      if (fixedRes.ok) setFixedAccounts((await fixedRes.json()).fixedAccounts || [])
      if (savingsRes.ok) setSavingsGoals((await savingsRes.json()).savingsGoals || [])
      if (billsRes.ok) setDueBills((await billsRes.json()).dueBills || [])
    } catch (err) {
      console.error('Load dashboard data error:', err)
    }
  }

  const loadFeed = async () => {
    try {
      setFeedLoading(true)
      const from = firstDayOfMonthISO()
      const res = await fetch(`/api/feed?from=${from}`)
      if (res.ok) {
        const j = await res.json()
        setFeed(j.items || [])
        setFeedCouple(j.couple || {})
      }
    } catch (err) {
      console.error('Load feed error:', err)
    } finally {
      setFeedLoading(false)
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

  const filteredFeed = feed.filter((it) => {
    if (viewMode === 'couple') return true
    if (viewMode === 'primary') return !it.personId || it.personId === couple.primary_user_id
    if (viewMode === 'secondary') return it.personId === couple.secondary_user_id
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero: greeting + view mode + quick action */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Olá, {primaryLabel}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Aqui está o panorama financeiro{' '}
            {viewMode === 'couple'
              ? 'do casal'
              : viewMode === 'primary'
                ? `de ${primaryLabel}`
                : secondaryLabel
                  ? `de ${secondaryLabel}`
                  : 'individual'}{' '}
            de hoje.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            onClick={qr.openRegister}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Registro rápido
            <span className="hidden md:inline text-[11px] opacity-75 ml-1">⌘K</span>
          </button>
        </div>
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
            <div className="text-xs text-[var(--text-muted)] mt-1 space-x-2">
              {summary.totalInvestmentsCurrent ? (
                <span>{formatBRL(summary.totalInvestmentsCurrent)} aplicados</span>
              ) : null}
              {summary.totalPatrimonioImoveis ? (
                <span>· {formatBRL(summary.totalPatrimonioImoveis)} em imóveis</span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal: feed à esquerda, laterais à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">Atividade do mês</h2>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                Transações, aluguéis, aportes e dívidas em um lugar só.
              </p>
            </div>
            <Link
              href="/dashboard/transacoes"
              className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-medium"
            >
              Ver tudo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {feedLoading ? (
            <div className="card p-8 text-center text-sm text-[var(--text-muted)]">
              Carregando atividade…
            </div>
          ) : filteredFeed.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[var(--text-muted)]">
              Nenhum lançamento ainda este mês.{' '}
              <button
                type="button"
                onClick={qr.openRegister}
                className="text-[var(--primary)] hover:underline font-medium"
              >
                Registrar agora
              </button>
              .
            </div>
          ) : (
            <FeedList
              items={filteredFeed}
              couple={{
                primaryId: feedCouple.primaryId,
                secondaryId: feedCouple.secondaryId,
                primaryLabel,
                secondaryLabel: secondaryLabel ?? 'Parceiro(a)',
              }}
            />
          )}
        </div>

        <div className="space-y-4">
          {forecast && (
            <ForecastCard
              averageMonthlyExpense={forecast.averageMonthlyExpense}
              averageDailyExpense={forecast.averageDailyExpense}
              totalForecast30Days={forecast.totalForecast30Days}
            />
          )}
          {fixedAccounts.length > 0 && <UpcomingFixedAccountsWidget accounts={fixedAccounts} />}
          {dueBills.length > 0 && <UpcomingDueBillsWidget bills={dueBills} />}
          {savingsGoals.length > 0 && <SavingsGoalsWidget goals={savingsGoals} />}
        </div>
      </div>

      {/* Ações rápidas */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Atalhos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: '/dashboard/contas', Icon: Wallet, label: 'Contas' },
            { href: '/dashboard/transacoes', Icon: CircleDollarSign, label: 'Transações' },
            { href: '/dashboard/imoveis', Icon: Building2, label: 'Imóveis' },
            { href: '/dashboard/calendario', Icon: CalendarDays, label: 'Calendário' },
            { href: '/dashboard/relatorios', Icon: BarChart3, label: 'Relatórios' },
            { href: '/dashboard/objetivos', Icon: Target, label: 'Metas' },
            { href: '/dashboard/contas-fixas', Icon: CircleDollarSign, label: 'Contas fixas' },
            { href: '/dashboard/dividas', Icon: PiggyBank, label: 'Dívidas' },
            { href: '/dashboard/investimentos', Icon: TrendingUp, label: 'Investimentos' },
            { href: '/dashboard/chat', Icon: MessageCircle, label: 'Chat IA' },
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
