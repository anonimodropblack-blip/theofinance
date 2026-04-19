'use client'

import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Gauge,
  Target,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts'

interface ScoreComponent {
  key: string
  label: string
  value: number
  max: number
  description: string
}

interface ScoreData {
  score: number
  rating: { label: string; color: 'success' | 'primary' | 'gold' | 'danger' }
  components: ScoreComponent[]
  diagnostics: string[]
  stats: {
    avgIncome: number
    avgExpense: number
    monthlyNet: number
    monthlyFixedExpense: number
    monthlyFixedIncome: number
    monthlyDebtInstallments: number
    netWorth: number
    liquidBalance: number
    investCurrent: number
    investInvested: number
    monthsOfExpensesCovered: number
    debtBalance: number
  }
  projection12: Array<{ month: number; balance: number }>
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const toneMap = {
  success: { fg: 'var(--success)', bg: 'var(--success-subtle)' },
  primary: { fg: 'var(--primary)', bg: 'var(--primary-subtle)' },
  gold: { fg: 'var(--gold)', bg: 'var(--gold-subtle)' },
  danger: { fg: 'var(--danger)', bg: 'var(--danger-subtle)' },
}

export default function ScorePage() {
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/analytics/score')
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Score financeiro
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Diagnóstico automático do casal com simulação de patrimônio em 12 meses.
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-6 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4 text-[var(--text-subtle)]">
                <Gauge className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Score do casal</span>
              </div>
              <ScoreGauge score={data.score} color={toneMap[data.rating.color].fg} />
              <div className="mt-4 text-center">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: toneMap[data.rating.color].bg,
                    color: toneMap[data.rating.color].fg,
                  }}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {data.rating.label}
                </div>
              </div>
            </div>
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 text-[var(--text-subtle)]">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Componentes do score</span>
              </div>
              <div className="space-y-4">
                {data.components.map((c) => {
                  const pct = (c.value / c.max) * 100
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[var(--text)]">{c.label}</span>
                        <span className="text-[var(--text-muted)] text-xs">
                          {c.value}/{c.max}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct >= 80
                                ? 'var(--success)'
                                : pct >= 50
                                ? 'var(--primary)'
                                : pct >= 30
                                ? 'var(--gold)'
                                : 'var(--danger)',
                          }}
                        />
                      </div>
                      <div className="text-xs text-[var(--text-subtle)] mt-1.5">{c.description}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MiniStat label="Receita média mensal" value={fmt(data.stats.avgIncome)} />
            <MiniStat label="Despesa média mensal" value={fmt(data.stats.avgExpense)} />
            <MiniStat
              label="Poupança média mensal"
              value={fmt(data.stats.monthlyNet)}
              tone={data.stats.monthlyNet >= 0 ? 'success' : 'danger'}
            />
            <MiniStat
              label="Reserva (meses cobertos)"
              value={`${data.stats.monthsOfExpensesCovered.toFixed(1)}m`}
              tone={
                data.stats.monthsOfExpensesCovered >= 6
                  ? 'success'
                  : data.stats.monthsOfExpensesCovered >= 3
                  ? 'primary'
                  : 'danger'
              }
            />
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="text-sm font-medium text-[var(--text)]">Diagnóstico automático</h3>
            </div>
            <div className="space-y-2">
              {data.diagnostics.map((d, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 bg-[var(--bg-elevated)] text-sm text-[var(--text-muted)] leading-relaxed"
                  style={{ borderLeft: '3px solid var(--primary)' }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--success)]" />
                <h3 className="text-sm font-medium text-[var(--text)]">
                  Simulação do patrimônio — próximos 12 meses
                </h3>
              </div>
              <div className="text-xs text-[var(--text-subtle)]">
                {fmt(data.stats.netWorth)} → {fmt(data.projection12[11]?.balance || data.stats.netWorth)}
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[{ month: 0, balance: data.stats.netWorth }, ...data.projection12]}
                >
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickFormatter={(v) => (v === 0 ? 'Hoje' : `+${v}m`)}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                    }}
                    formatter={(v: any) => fmt(v as number)}
                    labelFormatter={(v: any) => (v === 0 ? 'Hoje' : `Mês +${v}`)}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--primary)"
                    fill="url(#balanceGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-[var(--text-subtle)] leading-relaxed">
              Projeção linear baseada na média dos últimos 3 meses, somada a rendimento estimado de 0,5%
              ao mês sobre o total investido. Ajuste sua receita e corte gastos para mudar esse cenário.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const radius = 80
  const strokeWidth = 14
  const c = 2 * Math.PI * radius
  const progress = (score / 100) * c
  return (
    <div className="relative flex items-center justify-center">
      <svg width={200} height={200} className="-rotate-90">
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - progress}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-4xl font-bold text-[var(--text)]" style={{ color }}>
          {score}
        </div>
        <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">de 100</div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger' | 'primary'
}) {
  const color =
    tone === 'success'
      ? 'var(--success)'
      : tone === 'danger'
      ? 'var(--danger)'
      : tone === 'primary'
      ? 'var(--primary)'
      : 'var(--text)'
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">{label}</div>
      <div className="text-lg font-semibold mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
