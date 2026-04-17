'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DueBillCard from '@/components/DueBillCard'
import type { DueBill } from '@/types'

export default function DueBillsPage() {
  const [bills, setBills] = useState<DueBill[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<DueBill | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    due_date: '',
    category: '',
    description: '',
    reminder_days: '0',
  })
  const [paymentData, setPaymentData] = useState({
    amount_paid: '',
    payment_method: '',
    notes: '',
  })

  useEffect(() => {
    loadBills()
  }, [])

  const loadBills = async () => {
    try {
      const res = await fetch('/api/due-bills')
      const data = await res.json()
      setBills(data.dueBills || [])
    } catch (err) {
      console.error('Load bills error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/due-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          category: formData.category || null,
          description: formData.description || null,
          reminder_days: parseInt(formData.reminder_days),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setBills([data.dueBill, ...bills])
        setFormData({
          title: '',
          amount: '',
          due_date: '',
          category: '',
          description: '',
          reminder_days: '0',
        })
        setShowCreateModal(false)
      }
    } catch (err) {
      console.error('Create error:', err)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBill) return

    try {
      const res = await fetch(`/api/due-bills/${selectedBill.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid: parseFloat(paymentData.amount_paid),
          payment_method: paymentData.payment_method || null,
          notes: paymentData.notes || null,
        }),
      })

      if (res.ok) {
        // Reload bills to reflect payment
        loadBills()
        setPaymentData({
          amount_paid: '',
          payment_method: '',
          notes: '',
        })
        setShowPaymentModal(false)
        setSelectedBill(null)
      }
    } catch (err) {
      console.error('Payment error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/due-bills/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBills(bills.filter((b) => b.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const filteredBills = filterStatus === 'all'
    ? bills
    : bills.filter((b) => b.status === filterStatus)

  const overdueBills = bills.filter((b) => b.isOverdue).length
  const pendingBills = bills.filter((b) => b.status === 'pending').length
  const totalDue = bills
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + b.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contas a Vencer</h1>
            <p className="text-sm text-slate-400">Gerencie suas despesas pendentes</p>
          </div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Summary */}
        {bills.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm mb-2">VENCIDAS</p>
              <p className="text-2xl font-bold text-red-400">{overdueBills}</p>
            </div>
            <div className="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm mb-2">PENDENTES</p>
              <p className="text-2xl font-bold text-yellow-400">{pendingBills}</p>
            </div>
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">TOTAL A PAGAR</p>
              <p className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalDue)}
              </p>
            </div>
          </div>
        )}

        {/* Create Button + Filter */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => {
              setShowCreateModal(true)
              setFormData({
                title: '',
                amount: '',
                due_date: '',
                category: '',
                description: '',
                reminder_days: '0',
              })
            }}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
          >
            + Nova Conta
          </button>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagos</option>
            <option value="overdue">Vencidas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        {/* Bills List */}
        {bills.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-slate-400">Nenhuma conta a vencer criada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill) => (
              <DueBillCard
                key={bill.id}
                bill={bill}
                onMarkAsPaid={(b) => {
                  setSelectedBill(b)
                  setPaymentData({
                    amount_paid: b.amount.toString(),
                    payment_method: '',
                    notes: '',
                  })
                  setShowPaymentModal(true)
                }}
                onEdit={(bill) => {
                  setSelectedBill(bill)
                  setFormData({
                    title: bill.title,
                    amount: bill.amount.toString(),
                    due_date: bill.due_date,
                    category: bill.category || '',
                    description: bill.description || '',
                    reminder_days: bill.reminder_days.toString(),
                  })
                  setShowCreateModal(true)
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                {selectedBill ? 'Editar Conta' : 'Nova Conta a Vencer'}
              </h2>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Descrição*</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="Ex: Conta de luz, Aluguel"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Valor*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Data de Vencimento*</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="Ex: Moradia, Serviços"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Observações</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="Adicione detalhes"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Dias para Lembrete</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setSelectedBill(null)
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors font-medium"
                  >
                    {selectedBill ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                Registrar Pagamento
              </h2>

              <div className="mb-4 p-3 bg-slate-900/50 rounded">
                <p className="text-sm text-slate-400">{selectedBill.title}</p>
                <p className="text-lg font-bold text-white mt-1">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(selectedBill.amount)}
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Valor Pago*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.amount_paid}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, amount_paid: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Método de Pagamento</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, payment_method: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="">-- Selecione --</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="bank_transfer">Transferência</option>
                    <option value="cash">Dinheiro</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Observações</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false)
                      setSelectedBill(null)
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
                  >
                    Registrar Pagamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
