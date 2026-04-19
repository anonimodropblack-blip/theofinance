'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Wallet,
  LineChart as LineIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'

type Period = 'current_month' | 'last_month' | 'last_3_months' | 'year'

interface PersonStats {
  income: number
  expense: number
  transactionsCount: number
  accountsBalance: number
  investmentsCurrent: number
  investmentsInvested: number
}

interface Overview {
  period: Period
  couple: {
    id: string
    primary: { id: string; email: string }
    secondary: { id: string; email: string } | null
  }
  totals: {
    income: number
    expense: number
    net: number
    netWorth: number
    prevIncome: number
    prevExpense: number
    monthlyFixedExpense: number
  }
  byPerson: { primary: PersonStats; secondary: PersonStats }
  byCategory: Record<string, { income: number; expense: number }>
  byAccountType: Record<string, number>
  byAssetType: Record<string, { invested: number; current: number }>
  insights: string[]
  alerts: Array<{ title: string; description: string; severity: string; type: string }>
}

const PERIOD_LABELS: Record<Period, string> = {
  current_month: 'Este mês',
  last_month: 'Mês passado',
  last_3_months: 'Últimos 3 meses',
  year: 'Ano atual',
}

const ACCOUNT_LABELS: Record<string, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit: 'Crédito',
  cash: 'Dinheiro',
}

const ASSET_LABELS: Record<string, string> = {
  renda_fixa: 'Renda fixa',
  renda_variavel: 'Renda variável',
  cripto: 'Cripto',
  outros: 'Outros',
}

const COLORS = ['#3B82F6', '#10B981', '#FACC15', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316']

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type Tab = 'financeiro' | 'pessoa' | 'patrimonio' | 'categorias'

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('current_month')
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('financeiro')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/analytics/overview?period=${period}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Falha ao carregar')
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [period])

  const personPies = useMemo(() => {
    if (!data) return []
    const list = [
      {
        name: data.couple.primary.email?.split('@')[0] || 'Principal',
        value: data.byPerson.primary.accountsBalance + data.byPerson.primary.investmentsCurrent,
      },
    ]
    if (data.couple.secondary) {
      list.push({
        name: data.couple.secondary.email?.split('@')[0] || 'Parceiro',
        value: data.byPerson.secondary.accountsBalance + data.byPerson.secondary.investmentsCurrent,
      })
    }
    return list.filter((x) => x.value > 0)
  }, [data])

  const accountPies = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byAccountType)
      .map(([k, v]) => ({ name: ACCOUNT_LABELS[k] || k, value: v }))
      .filter((x) => x.value > 0)
  }, [data])

  const assetPies = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byAssetType)
      .map(([k, v]) => ({ name: ASSET_LABELS[k] || k, value: v.current }))
      .filter((x) => x.value > 0)
  }, [data])

  const categoryBars = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byCategory)
      .map(([k, v]) => ({ name: k, receita: v.income, despesa: v.expense }))
      .filter((x) => x.receita > 0 || x.despesa > 0)
      .sort((a, b) => b.despesa + b.receita - (a.despesa + a.receita))
      .slice(0, 10)
  }, [data])

  const personBars = useMemo(() => {
    if (!data) return []
    const primName = data.couple.primary.email?.split('@')[0] || 'Principal'
    const secName = data.couple.secondary?.email?.split('@')[0] || 'Parceiro'
    const list = [
      {
        name: primName,
        receita: data.byPerson.primary.income,
        despesa: data.byPerson.primary.expense,
      },
    ]
    if (data.couple.secondary) {
      list.push({
        name: secName,
        receita: data.byPerson.secondary.income,
        despesa: data.byPerson.secondary.expense,
      })
    }
    return list
  }, [data])

  const incomeGrowth = useMemo(() => {
    if (!data || data.totals.prevIncome === 0) return null
    return ((data.totals.income - data.totals.prevIncome) / data.totals.prevIncome) * 100
  }, [data])

  const expenseGrowth = useMemo(() => {
    if (!data || data.totals.prevExpense === 0) return null
    return ((data.totals.expense - data.totals.prevExpense) / data.totals.prevExpense) * 100
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Relatórios</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Análise financeira do casal — {PERIOD_LABELS[period].toLowerCase()}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                period === p
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-4 border-[var(--danger)]/30 bg-[var(--danger-subtle)] text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="card p-8 text-center text-[var(--text-muted)] text-sm">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Receita total"
              value={fmt(data.totals.income)}
              trend={incomeGrowth}
              tone="success"
            />
            <StatCard
              icon={<ArrowDownRight className="h-4 w-4" />}
              label="Despesa total"
              value={fmt(data.totals.expense)}
              trend={expenseGrowth !== null ? -expenseGrowth : null}
              tone="danger"
            />
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Saldo do período"
              value={fmt(data.totals.net)}
              tone={data.totals.net >= 0 ? 'primary' : 'danger'}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Patrimônio total"
              value={fmt(data.totals.netWorth)}
              tone="gold"
            />
          </div>

          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1 overflow-x-auto">
            {(
              [
                ['financeiro', 'Financeiro', BarChart3],
                ['pessoa', 'Por pessoa', Users],
                ['patrimonio', 'Patrimônio', PieIcon],
                ['categorias', 'Categorias', LineIcon],
              ] as Array<[Tab, string, any]>
            ).map(([k, lbl, Icon]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  tab === k
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {lbl}
              </button>
            ))}
          </div>

          {tab === 'financeiro' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Comparativo com mês anterior">
                <ComparativeList
                  rows={[
                    { label: 'Receita', current: data.totals.income, prev: data.totals.prevIncome },
                    { label: 'Despesa', current: data.totals.expense, prev: data.totals.prevExpense, inverse: true },
                  ]}
                />
              </Card>
              <Card title="Compromissos mensais fixos">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">Equivalente mensal</div>
                    <div className="text-2xl font-semibold text-[var(--text)] mt-1">
                      {fmt(data.totals.monthlyFixedExpense)}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Soma anualizada de todas as recorrências ativas, normalizada para o mês. Use como
                    referência para avaliar se sua renda mensal cobre os compromissos com folga.
                  </div>
                  {data.totals.income > 0 && (
                    <div className="pt-3 border-t border-[var(--border)]">
                      <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-1">
                        % da receita
                      </div>
                      <div className="text-lg font-medium text-[var(--text)]">
                        {Math.round((data.totals.monthlyFixedExpense / data.totals.income) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === 'pessoa' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Receita e despesa por pessoa">
                {personBars.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={personBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                        }}
                        formatter={(v: any) => fmt(v as number)}
                      />
                      <Legend />
                      <Bar dataKey="receita" fill="#10B981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="despesa" fill="#EF4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyCharts />
                )}
              </Card>
              <Card title="Patrimônio por pessoa">
                {personPies.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={personPies}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                      >
                        {personPies.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyCharts />
                )}
              </Card>
              <Card title="Contribuição e gasto" className="lg:col-span-2">
                <ContributionRow
                  primaryName={data.couple.primary.email?.split('@')[0] || 'Principal'}
                  secondaryName={data.couple.secondary?.email?.split('@')[0] || 'Parceiro'}
                  primary={data.byPerson.primary}
                  secondary={data.byPerson.secondary}
                  hasSecondary={!!data.couple.secondary}
                />
              </Card>
            </div>
          )}

          {tab === 'patrimonio' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Distribuição por tipo de conta">
                {accountPies.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={accountPies}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                      >
                        {accountPies.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyCharts />
                )}
              </Card>
              <Card title="Distribuição por classe de ativo">
                {assetPies.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={assetPies}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                      >
                        {assetPies.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyCharts />
                )}
              </Card>
            </div>
          )}

          {tab === 'categorias' && (
            <Card title="Top 10 categorias do período">
              {categoryBars.length > 0 ? (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={categoryBars} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} width={110} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                      }}
                      formatter={(v: any) => fmt(v as number)}
                    />
                    <Legend />
                    <Bar dataKey="receita" fill="#10B981" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="despesa" fill="#EF4444" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyCharts />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number | null
  tone: 'success' | 'danger' | 'primary' | 'gold'
}) {
  const toneColor =
    tone === 'success'
      ? 'var(--success)'
      : tone === 'danger'
      ? 'var(--danger)'
      : tone === 'gold'
      ? 'var(--gold)'
      : 'var(--primary)'
  const toneBg =
    tone === 'success'
      ? 'var(--success-subtle)'
      : tone === 'danger'
      ? 'var(--danger-subtle)'
      : tone === 'gold'
      ? 'var(--gold-subtle)'
      : 'var(--primary-subtle)'
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: toneBg, color: toneColor }}
        >
          {icon}
        </div>
        {typeof trend === 'number' && (
          <span
            className="text-xs font-medium"
            style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}
          >
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-semibold text-[var(--text)]">{value}</div>
    </div>
  )
}

function Card({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="text-sm font-medium text-[var(--text)] mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EmptyCharts() {
  return (
    <div className="h-[300px] flex items-center justify-center text-sm text-[var(--text-subtle)]">
      Sem dados suficientes no período.
    </div>
  )
}

function ComparativeList({
  rows,
}: {
  rows: Array<{ label: string; current: number; prev: number; inverse?: boolean }>
}) {
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const diff = r.prev === 0 ? null : ((r.current - r.prev) / r.prev) * 100
        const good = r.inverse ? (diff ?? 0) < 0 : (diff ?? 0) > 0
        return (
          <div key={r.label} className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text)]">{r.label}</div>
              <div className="text-xs text-[var(--text-subtle)]">
                Anterior: {fmt(r.prev)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-medium text-[var(--text)]">{fmt(r.current)}</div>
              {diff !== null && (
                <div
                  className="text-xs"
                  style={{ color: good ? 'var(--success)' : 'var(--danger)' }}
                >
                  {diff >= 0 ? '+' : ''}
                  {diff.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContributionRow({
  primaryName,
  secondaryName,
  primary,
  secondary,
  hasSecondary,
}: {
  primaryName: string
  secondaryName: string
  primary: PersonStats
  secondary: PersonStats
  hasSecondary: boolean
}) {
  const totalIncome = primary.income + (hasSecondary ? secondary.income : 0)
  const totalExpense = primary.expense + (hasSecondary ? secondary.expense : 0)

  const pShareIncome = totalIncome ? (primary.income / totalIncome) * 100 : 0
  const pShareExpense = totalExpense ? (primary.expense / totalExpense) * 100 : 0

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2 text-xs text-[var(--text-subtle)]">
          <span>Contribuição de receita</span>
          <span>{fmt(totalIncome)}</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
          <div
            style={{ width: `${pShareIncome}%`, background: '#10B981' }}
            className="transition-all"
          />
          {hasSecondary && (
            <div
              style={{ width: `${100 - pShareIncome}%`, background: '#3B82F6' }}
              className="transition-all"
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
          <span>
            {primaryName}: {fmt(primary.income)} ({pShareIncome.toFixed(0)}%)
          </span>
          {hasSecondary && (
            <span>
              {secondaryName}: {fmt(secondary.income)} ({(100 - pShareIncome).toFixed(0)}%)
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-xs text-[var(--text-subtle)]">
          <span>Distribuição de gastos</span>
          <span>{fmt(totalExpense)}</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
          <div
            style={{ width: `${pShareExpense}%`, background: '#F59E0B' }}
            className="transition-all"
          />
          {hasSecondary && (
            <div
              style={{ width: `${100 - pShareExpense}%`, background: '#EF4444' }}
              className="transition-all"
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
          <span>
            {primaryName}: {fmt(primary.expense)} ({pShareExpense.toFixed(0)}%)
          </span>
          {hasSecondary && (
            <span>
              {secondaryName}: {fmt(secondary.expense)} ({(100 - pShareExpense).toFixed(0)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
