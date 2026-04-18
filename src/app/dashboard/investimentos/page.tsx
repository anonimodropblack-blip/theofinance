'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  CircleDollarSign,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'

type AssetType = 'renda_fixa' | 'renda_variavel' | 'cripto' | 'outros'

interface Investment {
  id: string
  name: string
  ticker: string | null
  asset_type: AssetType
  invested_amount: number
  current_amount: number
  source: string | null
  notes: string | null
  last_updated_at: string
  created_at: string
}

const TYPE_CONFIG: Record<
  AssetType,
  { label: string; icon: typeof Briefcase; accent: string; subtle: string }
> = {
  renda_fixa: {
    label: 'Renda fixa',
    icon: CircleDollarSign,
    accent: 'text-[var(--color-primary)]',
    subtle: 'bg-[var(--color-primary-subtle)]',
  },
  renda_variavel: {
    label: 'Renda variável',
    icon: TrendingUp,
    accent: 'text-[var(--color-success)]',
    subtle: 'bg-[var(--color-success-subtle)]',
  },
  cripto: {
    label: 'Cripto',
    icon: Sparkles,
    accent: 'text-[var(--color-gold)]',
    subtle: 'bg-[var(--color-gold-subtle)]',
  },
  outros: {
    label: 'Outros',
    icon: Briefcase,
    accent: 'text-[var(--color-text-muted)]',
    subtle: 'bg-[var(--color-bg-elevated)]',
  },
}

const ORDERED_TYPES: AssetType[] = ['renda_fixa', 'renda_variavel', 'cripto', 'outros']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

type FormState = {
  name: string
  ticker: string
  asset_type: AssetType
  invested_amount: string
  current_amount: string
  source: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  ticker: '',
  asset_type: 'renda_fixa',
  invested_amount: '',
  current_amount: '',
  source: '',
  notes: '',
}

export default function InvestimentosPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await fetch('/api/investments')
      const data = await res.json()
      setInvestments(data.investments || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totals = useMemo(() => {
    let invested = 0
    let current = 0
    for (const inv of investments) {
      invested += Number(inv.invested_amount) || 0
      current += Number(inv.current_amount) || 0
    }
    const profit = current - invested
    const yieldPct = invested > 0 ? (profit / invested) * 100 : 0
    return { invested, current, profit, yieldPct }
  }, [investments])

  const byType = useMemo(() => {
    const map = new Map<AssetType, Investment[]>()
    for (const t of ORDERED_TYPES) map.set(t, [])
    for (const inv of investments) map.get(inv.asset_type)?.push(inv)
    return map
  }, [investments])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (inv: Investment) => {
    setEditing(inv)
    setForm({
      name: inv.name,
      ticker: inv.ticker ?? '',
      asset_type: inv.asset_type,
      invested_amount: String(inv.invested_amount),
      current_amount: String(inv.current_amount),
      source: inv.source ?? '',
      notes: inv.notes ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      ticker: form.ticker.trim() || undefined,
      asset_type: form.asset_type,
      invested_amount: parseFloat(form.invested_amount),
      current_amount: form.current_amount
        ? parseFloat(form.current_amount)
        : parseFloat(form.invested_amount),
      source: form.source.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    try {
      if (editing) {
        await fetch(`/api/investments/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/investments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditing(null)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (inv: Investment) => {
    if (!confirm(`Remover "${inv.name}"? Você pode restaurar pela lixeira.`)) return
    await fetch(`/api/investments/${inv.id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Investimentos</h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xl leading-relaxed">
            Patrimônio aplicado do casal. Atualize o valor atual sempre que
            quiser consolidar a performance.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary inline-flex items-center gap-2 text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Novo investimento
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total investido"
          value={formatCurrency(totals.invested)}
          icon={CircleDollarSign}
          accent="text-[var(--color-primary)]"
          subtle="bg-[var(--color-primary-subtle)]"
        />
        <SummaryCard
          label="Valor atual"
          value={formatCurrency(totals.current)}
          icon={Briefcase}
          accent="text-[var(--color-text)]"
          subtle="bg-[var(--color-bg-elevated)]"
        />
        <SummaryCard
          label={totals.profit >= 0 ? 'Lucro' : 'Prejuízo'}
          value={formatCurrency(Math.abs(totals.profit))}
          icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
          accent={
            totals.profit >= 0
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-danger)]'
          }
          subtle={
            totals.profit >= 0
              ? 'bg-[var(--color-success-subtle)]'
              : 'bg-[var(--color-danger-subtle)]'
          }
        />
        <SummaryCard
          label="Rentabilidade"
          value={formatPercent(totals.yieldPct)}
          icon={Sparkles}
          accent={
            totals.yieldPct >= 0
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-danger)]'
          }
          subtle="bg-[var(--color-gold-subtle)]"
        />
      </section>

      {loading ? (
        <div className="card p-10 text-center text-sm text-[var(--color-text-muted)]">
          Carregando investimentos…
        </div>
      ) : investments.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="space-y-6">
          {ORDERED_TYPES.map((type) => {
            const items = byType.get(type) ?? []
            if (!items.length) return null
            const cfg = TYPE_CONFIG[type]
            const Icon = cfg.icon
            const typeInvested = items.reduce(
              (sum, i) => sum + Number(i.invested_amount),
              0,
            )
            const typeCurrent = items.reduce(
              (sum, i) => sum + Number(i.current_amount),
              0,
            )
            const typeYield =
              typeInvested > 0
                ? ((typeCurrent - typeInvested) / typeInvested) * 100
                : 0
            return (
              <section key={type} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.subtle}`}
                    >
                      <Icon className={`w-4 h-4 ${cfg.accent}`} aria-hidden />
                    </div>
                    <div>
                      <h2 className="text-base font-medium">{cfg.label}</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {items.length} {items.length === 1 ? 'ativo' : 'ativos'}
                        {' · '}
                        {formatPercent(typeYield)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {formatCurrency(typeCurrent)}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((inv) => (
                    <InvestmentCard
                      key={inv.id}
                      investment={inv}
                      onEdit={() => openEdit(inv)}
                      onDelete={() => handleDelete(inv)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {showModal && (
        <InvestmentModal
          form={form}
          editing={!!editing}
          saving={saving}
          onChange={setForm}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
  subtle,
}: {
  label: string
  value: string
  icon: typeof Briefcase
  accent: string
  subtle: string
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subtle}`}>
        <Icon className={`w-5 h-5 ${accent}`} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <p className={`text-lg font-semibold truncate ${accent}`}>{value}</p>
      </div>
    </div>
  )
}

function InvestmentCard({
  investment,
  onEdit,
  onDelete,
}: {
  investment: Investment
  onEdit: () => void
  onDelete: () => void
}) {
  const invested = Number(investment.invested_amount) || 0
  const current = Number(investment.current_amount) || 0
  const profit = current - invested
  const yieldPct = invested > 0 ? (profit / invested) * 100 : 0
  const positive = profit >= 0

  return (
    <div className="card card-hover p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{investment.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {investment.ticker ? investment.ticker.toUpperCase() : '—'}
            {investment.source ? ` · ${investment.source}` : ''}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar"
            className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remover"
            className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-[var(--color-text-subtle)]">Investido</p>
          <p className="font-medium text-[var(--color-text)]">
            {formatCurrency(invested)}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-text-subtle)]">Atual</p>
          <p className="font-medium text-[var(--color-text)]">
            {formatCurrency(current)}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-text-subtle)]">
            {positive ? 'Lucro' : 'Prejuízo'}
          </p>
          <p
            className={`font-medium ${
              positive
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-danger)]'
            }`}
          >
            {formatPercent(yieldPct)}
          </p>
        </div>
      </div>

      {investment.notes && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
          {investment.notes}
        </p>
      )}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card p-10 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--color-primary-subtle)] flex items-center justify-center">
        <Briefcase className="w-6 h-6 text-[var(--color-primary)]" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Nenhum investimento cadastrado</p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Adicione seu primeiro ativo para começar a acompanhar o patrimônio.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" /> Adicionar investimento
      </button>
    </div>
  )
}

function InvestmentModal({
  form,
  editing,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: FormState
  editing: boolean
  saving: boolean
  onChange: (form: FormState) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <form
        onSubmit={onSubmit}
        className="card w-full sm:max-w-lg p-5 space-y-4 rounded-t-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? 'Editar investimento' : 'Novo investimento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-3">
          <Field label="Nome">
            <input
              required
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="input-base w-full"
              placeholder="Ex.: Tesouro Selic 2028"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ticker / código">
              <input
                value={form.ticker}
                onChange={(e) => onChange({ ...form, ticker: e.target.value })}
                className="input-base w-full"
                placeholder="BTC, ITUB4…"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={form.asset_type}
                onChange={(e) =>
                  onChange({ ...form, asset_type: e.target.value as AssetType })
                }
                className="input-base w-full"
              >
                {ORDERED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor investido">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.invested_amount}
                onChange={(e) =>
                  onChange({ ...form, invested_amount: e.target.value })
                }
                className="input-base w-full"
                placeholder="0,00"
              />
            </Field>
            <Field label="Valor atual">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.current_amount}
                onChange={(e) =>
                  onChange({ ...form, current_amount: e.target.value })
                }
                className="input-base w-full"
                placeholder="igual ao investido se vazio"
              />
            </Field>
          </div>

          <Field label="Origem / corretora">
            <input
              value={form.source}
              onChange={(e) => onChange({ ...form, source: e.target.value })}
              className="input-base w-full"
              placeholder="XP, Binance, Banco Inter…"
            />
          </Field>

          <Field label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
              className="input-base w-full min-h-20"
              placeholder="Rentabilidade esperada, estratégia, prazo…"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-sm"
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  )
}
