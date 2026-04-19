'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { Account, Couple, Transaction, User } from '@/types'
import { createBrowserClient } from '@supabase/ssr'

type TxType = 'income' | 'expense' | 'transfer'
type RuleType = '' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly'

const RULE_LABEL: Record<Exclude<RuleType, ''>, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

const TYPE_CONFIG: Record<
  TxType,
  { label: string; accent: string; subtle: string; sign: string; icon: typeof ArrowUpRight }
> = {
  income: {
    label: 'Receita',
    accent: 'text-[var(--color-success)]',
    subtle: 'bg-[var(--color-success-subtle)]',
    sign: '+',
    icon: ArrowDownLeft,
  },
  expense: {
    label: 'Despesa',
    accent: 'text-[var(--color-danger)]',
    subtle: 'bg-[var(--color-danger-subtle)]',
    sign: '-',
    icon: ArrowUpRight,
  },
  transfer: {
    label: 'Transferência',
    accent: 'text-[var(--color-primary)]',
    subtle: 'bg-[var(--color-primary-subtle)]',
    sign: '',
    icon: ArrowLeftRight,
  },
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

export default function TransacoesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [couple, setCouple] = useState<Couple | null>(null)
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterAccountId, setFilterAccountId] = useState('')
  const [filterType, setFilterType] = useState<TxType | ''>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    accountId: '',
    toAccountId: '',
    amount: '',
    type: 'expense' as TxType,
    category: '',
    subcategory: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paidByUserId: '',
    recurringRule: '' as RuleType,
    recurringUntil: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSession()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [filterAccountId])

  const loadSession = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) {
        setMe({
          id: auth.user.id,
          email: auth.user.email || '',
          created_at: auth.user.created_at,
        })
      }
      const accRes = await fetch('/api/accounts')
      const accData = await accRes.json()
      setAccounts(accData.accounts || [])

      if (auth.user) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('*')
          .or(`primary_user_id.eq.${auth.user.id},secondary_user_id.eq.${auth.user.id}`)
          .single()
        if (coupleData) setCouple(coupleData as Couple)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const url = filterAccountId
        ? `/api/transactions?accountId=${filterAccountId}`
        : '/api/transactions'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setTransactions(data.transactions || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const coupleMembers = useMemo(() => {
    const list: Array<{ id: string; label: string }> = []
    if (couple?.primary_user_id) {
      list.push({
        id: couple.primary_user_id,
        label: couple.primary_user_email || 'Titular',
      })
    }
    if (couple?.secondary_user_id) {
      list.push({
        id: couple.secondary_user_id,
        label: couple.secondary_user_email || 'Parceiro(a)',
      })
    }
    return list
  }, [couple])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType && t.type !== filterType) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const match =
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.subcategory?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [transactions, filterType, searchTerm])

  const getAccountName = (id: string | null | undefined) =>
    (id && accounts.find((a) => a.id === id)?.name) || '—'

  const getMemberLabel = (id: string | null | undefined) => {
    if (!id) return null
    if (id === me?.id) return 'Você'
    const m = coupleMembers.find((x) => x.id === id)
    return m?.label ?? null
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      accountId: accounts[0]?.id ?? '',
      toAccountId: '',
      amount: '',
      type: 'expense',
      category: '',
      subcategory: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paidByUserId: me?.id ?? '',
      recurringRule: '',
      recurringUntil: '',
    })
    setError('')
    setShowModal(true)
  }

  const openEdit = (t: Transaction) => {
    setEditingId(t.id)
    setForm({
      accountId: t.account_id ?? '',
      toAccountId: t.to_account_id ?? '',
      amount: String(t.amount ?? ''),
      type: t.type,
      category: t.category ?? '',
      subcategory: t.subcategory ?? '',
      description: t.description ?? '',
      date: (t.date ?? new Date().toISOString()).slice(0, 10),
      paidByUserId: t.paid_by_user_id ?? me?.id ?? '',
      recurringRule: (t.recurring_rule ?? '') as RuleType,
      recurringUntil: (t.recurring_until ?? '').slice(0, 10),
    })
    setError('')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta transação? Ela vai para a lixeira.')) return
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao excluir')
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.accountId || !form.amount) {
      setError('Conta e valor são obrigatórios')
      return
    }
    if (form.type === 'transfer' && !form.toAccountId) {
      setError('Escolha a conta de destino para transferência')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        accountId: form.accountId,
        toAccountId: form.type === 'transfer' ? form.toAccountId : null,
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category || null,
        subcategory: form.subcategory || null,
        description: form.description || null,
        date: form.date,
        paidByUserId: form.paidByUserId || null,
        recurringRule: form.recurringRule || null,
        recurringUntil: form.recurringUntil || null,
      }
      const res = editingId
        ? await fetch(`/api/transactions/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      if (editingId) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingId ? data.transaction : t)),
        )
      } else {
        setTransactions([data.transaction, ...transactions])
      }
      setShowModal(false)
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Transações</h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xl leading-relaxed">
            Registre receitas, despesas e transferências. Marque recorrência
            para lançamentos que se repetem.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary inline-flex items-center gap-2 text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nova transação
        </button>
      </header>

      {error && !showModal && (
        <div className="card p-4 border-[var(--color-danger)]/40 bg-[var(--color-danger-subtle)]">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      <section className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, categoria…"
            className="input-base w-full pl-9"
          />
        </div>
        <select
          value={filterAccountId}
          onChange={(e) => setFilterAccountId(e.target.value)}
          className="input-base text-sm sm:max-w-[220px]"
        >
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TxType | '')}
          className="input-base text-sm sm:max-w-[180px]"
        >
          <option value="">Todos os tipos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
          <option value="transfer">Transferência</option>
        </select>
      </section>

      {loading ? (
        <div className="card p-10 text-center text-sm text-[var(--color-text-muted)]">
          Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-[var(--color-text-muted)]">
          Nenhuma transação encontrada.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const cfg = TYPE_CONFIG[t.type]
            const Icon = cfg.icon
            const paidBy = getMemberLabel(t.paid_by_user_id)
            return (
              <div
                key={t.id}
                className="card card-hover p-4 flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.subtle}`}
                >
                  <Icon className={`w-5 h-5 ${cfg.accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">
                      {t.description || cfg.label}
                    </p>
                    {t.recurring_rule && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                        <Repeat className="w-3 h-3" />
                        {RULE_LABEL[t.recurring_rule]}
                      </span>
                    )}
                    {t.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                        {t.category}
                        {t.subcategory ? ` · ${t.subcategory}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {t.type === 'transfer'
                      ? `${getAccountName(t.account_id)} → ${getAccountName(t.to_account_id)}`
                      : getAccountName(t.account_id)}
                    {' · '}
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                    {paidBy ? ` · Pago por ${paidBy}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-semibold ${cfg.accent} whitespace-nowrap`}>
                    {cfg.sign}
                    {formatBRL(Number(t.amount))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-2 rounded-lg hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)] text-[var(--color-text-muted)]"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false)
            setEditingId(null)
          }}
        >
          <div
            className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar transação' : 'Nova transação'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingId(null)
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['expense', 'income', 'transfer'] as TxType[]).map((t) => {
                  const cfg = TYPE_CONFIG[t]
                  const active = form.type === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                        active
                          ? `${cfg.subtle} ${cfg.accent} border-[var(--color-border-strong)]`
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    {form.type === 'transfer' ? 'Conta de origem*' : 'Conta*'}
                  </label>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    className="input-base w-full"
                    required
                  >
                    <option value="">Selecione</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                {form.type === 'transfer' ? (
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                      Conta de destino*
                    </label>
                    <select
                      value={form.toAccountId}
                      onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                      className="input-base w-full"
                      required
                    >
                      <option value="">Selecione</option>
                      {accounts
                        .filter((a) => a.id !== form.accountId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                      Valor*
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="input-base w-full"
                      required
                      placeholder="0,00"
                    />
                  </div>
                )}
              </div>

              {form.type === 'transfer' && (
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Valor*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="input-base w-full"
                    required
                    placeholder="0,00"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                  Descrição
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-base w-full"
                  placeholder="Ex: Mercado, Uber…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-base w-full"
                    placeholder="Alimentação"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Subcategoria
                  </label>
                  <input
                    type="text"
                    value={form.subcategory}
                    onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                    className="input-base w-full"
                    placeholder="Supermercado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Data*
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-base w-full"
                    required
                  />
                </div>
                {form.type !== 'transfer' && coupleMembers.length > 0 && (
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                      Quem pagou
                    </label>
                    <select
                      value={form.paidByUserId}
                      onChange={(e) =>
                        setForm({ ...form, paidByUserId: e.target.value })
                      }
                      className="input-base w-full"
                    >
                      {coupleMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id === me?.id ? 'Você' : m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--color-border)] p-3 space-y-3 bg-[var(--color-bg-elevated)]">
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="font-medium">Repetir esta transação</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.recurringRule}
                    onChange={(e) =>
                      setForm({ ...form, recurringRule: e.target.value as RuleType })
                    }
                    className="input-base w-full text-sm"
                  >
                    <option value="">Não repete</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                    <option value="bimonthly">Bimestral</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                  <input
                    type="date"
                    value={form.recurringUntil}
                    onChange={(e) =>
                      setForm({ ...form, recurringUntil: e.target.value })
                    }
                    disabled={!form.recurringRule}
                    className="input-base w-full text-sm disabled:opacity-50"
                    placeholder="Até (opcional)"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40">
                  <p className="text-sm text-[var(--color-danger)]">{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
                  }}
                  className="btn-ghost flex-1 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 text-sm disabled:opacity-60"
                >
                  {submitting ? 'Salvando…' : editingId ? 'Salvar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
