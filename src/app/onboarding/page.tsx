'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Users,
  Wallet,
  Target,
  CircleDollarSign,
} from 'lucide-react'

type AccountType = 'checking' | 'savings' | 'credit' | 'cash'

interface DraftAccount {
  name: string
  type: AccountType
  balance: string
}

interface DraftGoal {
  name: string
  amount: string
}

const STEPS = [
  { key: 'nome', label: 'Seu nome', icon: Sparkles },
  { key: 'parceiro', label: 'Parceiro', icon: Users },
  { key: 'contas', label: 'Contas', icon: Wallet },
  { key: 'metas', label: 'Metas', icon: Target },
  { key: 'resumo', label: 'Tudo pronto', icon: Check },
]

const ACCOUNT_LABELS: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit: 'Crédito',
  cash: 'Dinheiro',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [accounts, setAccounts] = useState<DraftAccount[]>([
    { name: 'Conta principal', type: 'checking', balance: '0' },
  ])
  const [goal, setGoal] = useState<DraftGoal>({ name: 'Reserva de emergência', amount: '10000' })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/onboarding')
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/auth/login')
            return
          }
          throw new Error('Falha ao carregar')
        }
        const json = await res.json()
        if (json.onboarded) {
          router.push('/dashboard')
          return
        }
        setDisplayName(json.displayName || '')
        setPartnerEmail(json.partnerEmail || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleNext = async () => {
    setError('')
    if (step === 0 && !displayName.trim()) {
      setError('Informe seu nome para continuar')
      return
    }
    if (step === 2 && accounts.some((a) => !a.name.trim())) {
      setError('Todas as contas precisam de nome')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setError('')
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleFinish = async () => {
    try {
      setSaving(true)
      setError('')

      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          partnerEmail: partnerEmail.trim() || null,
        }),
      })

      for (const a of accounts) {
        if (!a.name.trim()) continue
        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: a.name.trim(),
            type: a.type,
            balance: Number(a.balance || 0),
            color: '#3B82F6',
          }),
        })
      }

      if (goal.name.trim() && Number(goal.amount) > 0) {
        await fetch('/api/savings-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: goal.name.trim(),
            target_amount: Number(goal.amount),
            icon: 'target',
            color: '#10B981',
          }),
        }).catch(() => {})
      }

      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete: true }),
      })

      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao finalizar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-sm text-[var(--text-muted)]">Carregando…</div>
      </div>
    )
  }

  const Current = STEPS[step].icon

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--success)] flex items-center justify-center">
              <CircleDollarSign className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              Theo<span className="text-[var(--primary)]">Finance</span>
            </h1>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            Vamos configurar sua conta em poucos passos.
          </div>
        </header>

        <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = i === step
            const done = i < step
            const Icon = s.icon
            return (
              <div key={s.key} className="flex items-center gap-2 shrink-0">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                  style={{
                    background: done
                      ? 'var(--success)'
                      : active
                      ? 'var(--primary)'
                      : 'var(--bg-elevated)',
                    color: done || active ? '#fff' : 'var(--text-subtle)',
                    border: `1px solid ${done || active ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="h-px w-8 transition-colors"
                    style={{ background: done ? 'var(--success)' : 'var(--border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6 text-[var(--primary)]">
            <Current className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-[var(--text)]">{STEPS[step].label}</h2>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Como prefere ser chamado? Esse nome aparece no dashboard e nos relatórios.
              </p>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Kaleo"
                className="input-base w-full"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Vai dividir as finanças com alguém? Informe o email do parceiro para um convite futuro. Pode deixar em branco e conectar depois.
              </p>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="parceiro@exemplo.com"
                className="input-base w-full"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Cadastre suas contas principais e informe o saldo atual. Você pode adicionar mais depois.
              </p>
              <div className="space-y-3">
                {accounts.map((a, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                        Conta {i + 1}
                      </div>
                      {accounts.length > 1 && (
                        <button
                          onClick={() => setAccounts(accounts.filter((_, idx) => idx !== i))}
                          className="text-xs text-[var(--danger)] hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={a.name}
                      onChange={(e) => {
                        const copy = [...accounts]
                        copy[i].name = e.target.value
                        setAccounts(copy)
                      }}
                      placeholder="Nome da conta"
                      className="input-base w-full"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={a.type}
                        onChange={(e) => {
                          const copy = [...accounts]
                          copy[i].type = e.target.value as AccountType
                          setAccounts(copy)
                        }}
                        className="input-base w-full"
                      >
                        {(Object.keys(ACCOUNT_LABELS) as AccountType[]).map((t) => (
                          <option key={t} value={t}>
                            {ACCOUNT_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={a.balance}
                        onChange={(e) => {
                          const copy = [...accounts]
                          copy[i].balance = e.target.value
                          setAccounts(copy)
                        }}
                        placeholder="Saldo inicial"
                        className="input-base w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setAccounts([...accounts, { name: '', type: 'checking', balance: '0' }])
                }
                className="btn-ghost text-sm w-full"
              >
                + Adicionar outra conta
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Defina uma meta inicial — por exemplo uma reserva de emergência. Você pode editar ou criar outras depois.
              </p>
              <input
                type="text"
                value={goal.name}
                onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                placeholder="Nome da meta"
                className="input-base w-full"
              />
              <input
                type="number"
                step="0.01"
                value={goal.amount}
                onChange={(e) => setGoal({ ...goal, amount: e.target.value })}
                placeholder="Valor alvo"
                className="input-base w-full"
              />
              <div className="text-xs text-[var(--text-subtle)]">
                Valor sugerido: 6 meses de despesa mensal média.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Tudo pronto para começar. Revisão do que vai ser criado:
              </p>
              <div className="space-y-2">
                <SummaryRow label="Nome no app" value={displayName || '—'} />
                <SummaryRow label="Parceiro" value={partnerEmail || 'nenhum'} />
                <SummaryRow
                  label="Contas"
                  value={`${accounts.filter((a) => a.name.trim()).length} conta(s)`}
                />
                <SummaryRow
                  label="Meta inicial"
                  value={
                    goal.name.trim() && Number(goal.amount) > 0
                      ? `${goal.name} — ${new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(goal.amount))}`
                      : 'nenhuma'
                  }
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-[var(--danger)] bg-[var(--danger-subtle)] p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-2">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="btn-ghost inline-flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                {saving ? 'Finalizando…' : 'Entrar no dashboard'}
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[var(--text)]">{value}</span>
    </div>
  )
}
