'use client'

import { useEffect, useState } from 'react'
import { Plus, CircleDollarSign } from 'lucide-react'

type DebtStatus = 'active' | 'paid' | 'negotiated'

interface Debt {
  id: string
  name: string
  creditor: string
  total_amount: number
  remaining_amount: number
  installments_total: number
  installments_paid: number
  installment_value?: number
  due_day?: number
  status: DebtStatus
  notes?: string
  created_at: string
}

const statusConfig: Record<DebtStatus, { label: string; color: string }> = {
  active:     { label: 'Ativa',      color: 'bg-[var(--danger-subtle)] text-[var(--danger)]' },
  paid:       { label: 'Paga',       color: 'bg-[var(--success-subtle)] text-[var(--success)]' },
  negotiated: { label: 'Negociada',  color: 'bg-[var(--gold-subtle)] text-[var(--gold)]' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [payInstallments, setPayInstallments] = useState(1)
  const [formData, setFormData] = useState({
    name: '', creditor: '', total_amount: '',
    installments_total: '1', installment_value: '', due_day: '', notes: '',
  })

  useEffect(() => { loadDebts() }, [])

  const loadDebts = async () => {
    try {
      const res = await fetch('/api/debts')
      const data = await res.json()
      setDebts(data.debts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingDebt(null)
    setFormData({ name: '', creditor: '', total_amount: '', installments_total: '1', installment_value: '', due_day: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setFormData({
      name: debt.name,
      creditor: debt.creditor,
      total_amount: String(debt.total_amount),
      installments_total: String(debt.installments_total),
      installment_value: debt.installment_value ? String(debt.installment_value) : '',
      due_day: debt.due_day ? String(debt.due_day) : '',
      notes: debt.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: formData.name,
      creditor: formData.creditor,
      total_amount: parseFloat(formData.total_amount),
      installments_total: parseInt(formData.installments_total),
      installment_value: formData.installment_value ? parseFloat(formData.installment_value) : undefined,
      due_day: formData.due_day ? parseInt(formData.due_day) : undefined,
      notes: formData.notes || undefined,
    }

    if (editingDebt) {
      await fetch(`/api/debts/${editingDebt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setShowModal(false)
    loadDebts()
  }

  const handleStatusChange = async (debt: Debt, status: DebtStatus) => {
    await fetch(`/api/debts/${debt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadDebts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Mover esta dívida para a lixeira?')) return
    await fetch(`/api/debts/${id}`, { method: 'DELETE' })
    loadDebts()
  }

  const openPay = (debt: Debt) => {
    setPayingDebt(debt)
    setPayInstallments(1)
    setShowPayModal(true)
  }

  const handlePay = async () => {
    if (!payingDebt) return
    const newPaid = Math.min(payingDebt.installments_paid + payInstallments, payingDebt.installments_total)
    const paidRatio = newPaid / payingDebt.installments_total
    const remaining = payingDebt.total_amount * (1 - paidRatio)
    const newStatus: DebtStatus = newPaid >= payingDebt.installments_total ? 'paid' : 'active'

    await fetch(`/api/debts/${payingDebt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installments_paid: newPaid,
        remaining_amount: Math.max(0, remaining),
        status: newStatus,
      }),
    })
    setShowPayModal(false)
    loadDebts()
  }

  const totalDebts = debts.filter(d => d.status === 'active').reduce((sum, d) => sum + d.remaining_amount, 0)
  const activeCount = debts.filter(d => d.status === 'active').length
  const paidCount = debts.filter(d => d.status === 'paid').length

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Dívidas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Acompanhe suas dívidas e registre pagamentos.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova dívida
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Total em aberto</p>
          <p className="text-2xl font-semibold text-[var(--danger)] tabular-nums mt-2">{formatCurrency(totalDebts)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Dívidas ativas</p>
          <p className="text-2xl font-semibold text-[var(--text)] tabular-nums mt-2">{activeCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Dívidas pagas</p>
          <p className="text-2xl font-semibold text-[var(--success)] tabular-nums mt-2">{paidCount}</p>
        </div>
      </div>

      {/* Debts List */}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando...</p>
      ) : debts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <p className="text-[var(--text)] font-medium">Nenhuma dívida cadastrada</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Adicione suas dívidas para acompanhar o progresso.</p>
          <button onClick={openCreate} className="btn-primary mt-4">
            Adicionar dívida
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map(debt => {
            const progress = ((debt.installments_paid / debt.installments_total) * 100).toFixed(0)
            const cfg = statusConfig[debt.status]
            return (
              <div key={debt.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{debt.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{debt.creditor}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-subtle)]">Valor restante</p>
                    <p className="font-semibold text-[var(--danger)] tabular-nums mt-0.5">{formatCurrency(debt.remaining_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-subtle)]">Total</p>
                    <p className="font-semibold text-[var(--text)] tabular-nums mt-0.5">{formatCurrency(debt.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-subtle)]">Parcelas</p>
                    <p className="font-semibold text-[var(--text)] tabular-nums mt-0.5">{debt.installments_paid}/{debt.installments_total}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-[var(--text-subtle)] mb-1.5">
                    <span>Progresso</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--success)] rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {(debt.installment_value || debt.due_day) && (
                  <div className="flex gap-4 text-xs text-[var(--text-subtle)] mb-4">
                    {debt.installment_value && <span>Parcela: {formatCurrency(debt.installment_value)}</span>}
                    {debt.due_day && <span>Vence dia {debt.due_day}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {debt.status === 'active' && (
                    <button
                      onClick={() => openPay(debt)}
                      className="inline-flex items-center rounded-lg bg-[var(--success-subtle)] hover:bg-[var(--success)] hover:text-white text-[var(--success)] px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                      Registrar pagamento
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(debt)}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] px-3 py-1.5 text-sm transition-colors"
                  >
                    Editar
                  </button>
                  {debt.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(debt, 'negotiated')}
                      className="inline-flex items-center rounded-lg bg-[var(--gold-subtle)] hover:opacity-80 text-[var(--gold)] px-3 py-1.5 text-sm transition-colors"
                    >
                      Negociada
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(debt.id)}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] text-[var(--text-subtle)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 px-3 py-1.5 text-sm transition-colors ml-auto"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-5">{editingDebt ? 'Editar dívida' : 'Nova dívida'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Nome da dívida</label>
                  <input
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Financiamento do carro"
                    className="input-base w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Credor</label>
                  <input
                    type="text" required
                    value={formData.creditor}
                    onChange={e => setFormData(p => ({ ...p, creditor: e.target.value }))}
                    placeholder="Ex: Banco Itaú"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Valor total (R$)</label>
                  <input
                    type="number" step="0.01" required min="0.01"
                    value={formData.total_amount}
                    onChange={e => setFormData(p => ({ ...p, total_amount: e.target.value }))}
                    placeholder="0,00"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Total de parcelas</label>
                  <input
                    type="number" min="1"
                    value={formData.installments_total}
                    onChange={e => setFormData(p => ({ ...p, installments_total: e.target.value }))}
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Valor da parcela (R$)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={formData.installment_value}
                    onChange={e => setFormData(p => ({ ...p, installment_value: e.target.value }))}
                    placeholder="Opcional"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Dia do vencimento</label>
                  <input
                    type="number" min="1" max="31"
                    value={formData.due_day}
                    onChange={e => setFormData(p => ({ ...p, due_day: e.target.value }))}
                    placeholder="Ex: 15"
                    className="input-base w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Opcional"
                    className="input-base w-full resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingDebt ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && payingDebt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Registrar pagamento</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">{payingDebt.name}</p>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Quantas parcelas pagar? (restam {payingDebt.installments_total - payingDebt.installments_paid})
              </label>
              <input
                type="number" min="1" max={payingDebt.installments_total - payingDebt.installments_paid}
                value={payInstallments}
                onChange={e => setPayInstallments(parseInt(e.target.value) || 1)}
                className="input-base w-full"
              />
              {payingDebt.installment_value && (
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  Total: <span className="text-[var(--text)] font-medium tabular-nums">{formatCurrency(payingDebt.installment_value * payInstallments)}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPayModal(false)} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button
                onClick={handlePay}
                className="flex-1 rounded-xl bg-[var(--success)] hover:opacity-90 text-white px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
