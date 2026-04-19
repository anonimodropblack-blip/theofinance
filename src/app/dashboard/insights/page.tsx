'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Lightbulb,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface Overview {
  totals: { income: number; expense: number; net: number; netWorth: number; prevIncome: number; prevExpense: number }
  insights: string[]
  alerts: Array<{ title: string; description: string; severity: string; type: string }>
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function InsightsPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/analytics/overview?period=current_month')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Falha ao carregar')
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const severityStyle = (sev: string) => {
    if (sev === 'critical')
      return { bg: 'var(--danger-subtle)', fg: 'var(--danger)', border: 'var(--danger)' }
    if (sev === 'warning')
      return { bg: 'var(--gold-subtle)', fg: 'var(--gold)', border: 'var(--gold)' }
    return { bg: 'var(--primary-subtle)', fg: 'var(--primary)', border: 'var(--primary)' }
  }

  const severityIcon = (sev: string) => {
    if (sev === 'critical') return <AlertTriangle className="h-4 w-4" />
    if (sev === 'warning') return <AlertCircle className="h-4 w-4" />
    return <Info className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Insights & alertas</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Análise automática do período — padrões, riscos e oportunidades.
        </p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Receita vs mês anterior"
              value={
                data.totals.prevIncome === 0
                  ? '—'
                  : `${(((data.totals.income - data.totals.prevIncome) / data.totals.prevIncome) * 100).toFixed(1)}%`
              }
              tone={data.totals.income >= data.totals.prevIncome ? 'success' : 'danger'}
            />
            <KpiCard
              icon={<TrendingDown className="h-4 w-4" />}
              label="Despesa vs mês anterior"
              value={
                data.totals.prevExpense === 0
                  ? '—'
                  : `${(((data.totals.expense - data.totals.prevExpense) / data.totals.prevExpense) * 100).toFixed(1)}%`
              }
              tone={data.totals.expense <= data.totals.prevExpense ? 'success' : 'danger'}
            />
            <KpiCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Saldo do mês"
              value={fmt(data.totals.net)}
              tone={data.totals.net >= 0 ? 'primary' : 'danger'}
            />
          </div>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="text-sm font-medium text-[var(--text)]">Insights automáticos</h3>
            </div>
            {data.insights.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
                Nada fora do padrão neste período. Continue acompanhando.
              </div>
            ) : (
              <div className="space-y-2">
                {data.insights.map((i, idx) => (
                  <div
                    key={idx}
                    className="card p-4 flex items-start gap-3 card-hover"
                    style={{ borderLeft: '3px solid var(--primary)' }}
                  >
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
                    <p className="text-sm text-[var(--text)] leading-relaxed">{i}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-[var(--gold)]" />
              <h3 className="text-sm font-medium text-[var(--text)]">Alertas inteligentes</h3>
            </div>
            {data.alerts.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
                Nenhum alerta no momento. Seu fluxo está saudável.
              </div>
            ) : (
              <div className="space-y-2">
                {data.alerts.map((a, idx) => {
                  const s = severityStyle(a.severity)
                  return (
                    <div
                      key={idx}
                      className="card p-4 flex items-start gap-3"
                      style={{ borderLeft: `3px solid ${s.border}` }}
                    >
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: s.bg, color: s.fg }}
                      >
                        {severityIcon(a.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--text)]">{a.title}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                          {a.description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'success' | 'danger' | 'primary'
}) {
  const color =
    tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : 'var(--primary)'
  const bg =
    tone === 'success'
      ? 'var(--success-subtle)'
      : tone === 'danger'
      ? 'var(--danger-subtle)'
      : 'var(--primary-subtle)'
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
