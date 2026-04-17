'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

const statusConfig: Record<DebtStatus, { label: string; color: string; bg: string }> = {
  active:     { label: 'Ativa',       color: 'text-rose-400',   bg: 'bg-rose-400/10' },
  paid:       { label: 'Paga',        color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  negotiated: { label: 'Negociada',   color: 'text-amber-400',  bg: 'bg-amber-400/10' },
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
    if (!confirm('Mover esta divida para a lixeira?')) return
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
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm mb-2 block">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Dividas</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie suas dividas e parcelas</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nova Divida
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Total em Aberto</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(totalDebts)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Dividas Ativas</p>
            <p className="text-2xl font-bold mt-1">{activeCount}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Dividas Pagas</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{paidCount}</p>
          </div>
        </div>

        {/* Debts List */}
        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : debts.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-slate-300 font-medium">Nenhuma divida cadastrada</p>
            <p className="text-slate-500 text-sm mt-1">Adicione suas dividas para acompanhar o progresso</p>
            <button onClick={openCreate} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Adicionar Divida
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {debts.map(debt => {
              const progress = ((debt.installments_paid / debt.installments_total) * 100).toFixed(0)
              const cfg = statusConfig[debt.status]
              return (
                <div key={debt.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{debt.name}</h3>
                      <p className="text-slate-400 text-sm">{debt.creditor}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-slate-400">Valor restante</p>
                      <p className="font-semibold text-rose-400">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total</p>
                      <p className="font-semibold">{formatCurrency(debt.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Parcelas</p>
                      <p className="font-semibold">{debt.installments_paid}/{debt.installments_total}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {(debt.installment_value || debt.due_day) && (
                    <div className="flex gap-4 text-xs text-slate-400 mb-4">
                      {debt.installment_value && <span>Parcela: {formatCurrency(debt.installment_value)}</span>}
                      {debt.due_day && <span>Vence dia {debt.due_day}</span>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {debt.status === 'active' && (
                      <button
                        onClick={() => openPay(debt)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        Registrar Pagamento
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(debt)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Editar
                    </button>
                    {debt.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(debt, 'negotiated')}
                        className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        Negociada
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors ml-auto"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700">
            <h2 className="text-xl font-bold mb-6">{editingDebt ? 'Editar Divida' : 'Nova Divida'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Nome da divida</label>
                  <input
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Financiamento do carro"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Credor</label>
                  <input
                    type="text" required
                    value={formData.creditor}
                    onChange={e => setFormData(p => ({ ...p, creditor: e.target.value }))}
                    placeholder="Ex: Banco Itau"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Valor total (R$)</label>
                  <input
                    type="number" step="0.01" required min="0.01"
                    value={formData.total_amount}
                    onChange={e => setFormData(p => ({ ...p, total_amount: e.target.value }))}
                    placeholder="0,00"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Total de parcelas</label>
                  <input
                    type="number" min="1"
                    value={formData.installments_total}
                    onChange={e => setFormData(p => ({ ...p, installments_total: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Valor da parcela (R$)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={formData.installment_value}
                    onChange={e => setFormData(p => ({ ...p, installment_value: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Dia do vencimento</label>
                  <input
                    type="number" min="1" max="31"
                    value={formData.due_day}
                    onChange={e => setFormData(p => ({ ...p, due_day: e.target.value }))}
                    placeholder="Ex: 15"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Observacoes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg font-medium transition-colors">
                  {editingDebt ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && payingDebt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
            <h2 className="text-xl font-bold mb-2">Registrar Pagamento</h2>
            <p className="text-slate-400 text-sm mb-6">{payingDebt.name}</p>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Quantas parcelas pagar? (restam {payingDebt.installments_total - payingDebt.installments_paid})
              </label>
              <input
                type="number" min="1" max={payingDebt.installments_total - payingDebt.installments_paid}
                value={payInstallments}
                onChange={e => setPayInstallments(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              />
              {payingDebt.installment_value && (
                <p className="text-slate-400 text-sm mt-2">
                  Total: {formatCurrency(payingDebt.installment_value * payInstallments)}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPayModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handlePay}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium transition-colors">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
