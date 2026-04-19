'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  List,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import type { DueBill, FixedAccount, Imovel, ImovelPagamento, Transaction } from '@/types'

type CalendarEvent =
  | {
      kind: 'bill'
      id: string
      date: string
      title: string
      amount: number
      status: DueBill['status']
      category?: string
      isOverdue: boolean
      raw: DueBill
    }
  | {
      kind: 'fixed'
      id: string
      date: string
      title: string
      amount: number
      category?: string
      frequency: FixedAccount['frequency']
      fixedType: 'expense' | 'income'
      raw: FixedAccount
    }
  | {
      kind: 'transaction'
      id: string
      date: string
      title: string
      amount: number
      category?: string
      rule: NonNullable<Transaction['recurring_rule']>
      txType: Transaction['type']
      raw: Transaction
    }
  | {
      kind: 'imovel'
      id: string
      date: string
      title: string
      amount: number
      amountLiquido: number
      pago: boolean
      isOverdue: boolean
      mesReferencia: string
      raw: Imovel
      pagamento: ImovelPagamento | null
    }

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const FREQUENCY_LABEL: Record<FixedAccount['frequency'], string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

const TX_RULE_LABEL: Record<NonNullable<Transaction['recurring_rule']>, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

function isoDate(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function parseIsoDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(day, last)
}

function projectTransaction(
  tx: Transaction,
  monthStart: Date,
  monthEnd: Date,
): string[] {
  if (!tx.recurring_rule) return []
  const anchor = parseIsoDate(tx.date.slice(0, 10))
  const until = tx.recurring_until ? parseIsoDate(tx.recurring_until.slice(0, 10)) : null
  if (until && until < monthStart) return []
  if (anchor > monthEnd) return []

  const dayOfMonth = anchor.getDate()
  const year = monthStart.getFullYear()
  const monthIndex = monthStart.getMonth()
  const dates: string[] = []

  const pushIfValid = (iso: string) => {
    const d = parseIsoDate(iso)
    if (d < anchor) return
    if (until && d > until) return
    if (d < monthStart || d > monthEnd) return
    dates.push(iso)
  }

  switch (tx.recurring_rule) {
    case 'monthly': {
      const d = clampDayToMonth(year, monthIndex, dayOfMonth)
      pushIfValid(isoDate(year, monthIndex, d))
      break
    }
    case 'bimonthly':
    case 'quarterly':
    case 'yearly': {
      const step =
        tx.recurring_rule === 'bimonthly'
          ? 2
          : tx.recurring_rule === 'quarterly'
            ? 3
            : 12
      const diff = monthsBetween(anchor, monthStart)
      if (diff >= 0 && diff % step === 0) {
        const d = clampDayToMonth(year, monthIndex, dayOfMonth)
        pushIfValid(isoDate(year, monthIndex, d))
      }
      break
    }
    case 'weekly':
    case 'biweekly': {
      const step = tx.recurring_rule === 'weekly' ? 7 : 14
      const cursor = new Date(anchor)
      while (cursor < monthStart) {
        cursor.setDate(cursor.getDate() + step)
      }
      while (cursor <= monthEnd) {
        pushIfValid(
          isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
        )
        cursor.setDate(cursor.getDate() + step)
      }
      break
    }
  }

  return dates
}

function projectFixedAccount(
  acc: FixedAccount,
  monthStart: Date,
  monthEnd: Date,
): string[] {
  if (!acc.is_active) return []

  const anchor = parseIsoDate(acc.created_at.slice(0, 10))
  const dayOfMonth = acc.due_date ?? anchor.getDate()
  const year = monthStart.getFullYear()
  const monthIndex = monthStart.getMonth()

  const dates: string[] = []

  switch (acc.frequency) {
    case 'monthly': {
      const d = clampDayToMonth(year, monthIndex, dayOfMonth)
      dates.push(isoDate(year, monthIndex, d))
      break
    }
    case 'bimonthly':
    case 'quarterly':
    case 'yearly': {
      const step =
        acc.frequency === 'bimonthly' ? 2 : acc.frequency === 'quarterly' ? 3 : 12
      const diff = monthsBetween(anchor, monthStart)
      if (diff >= 0 && diff % step === 0) {
        const d = clampDayToMonth(year, monthIndex, dayOfMonth)
        dates.push(isoDate(year, monthIndex, d))
      }
      break
    }
    case 'weekly':
    case 'biweekly': {
      const step = acc.frequency === 'weekly' ? 7 : 14
      const cursor = new Date(anchor)
      while (cursor < monthStart) {
        cursor.setDate(cursor.getDate() + step)
      }
      while (cursor <= monthEnd) {
        dates.push(
          isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
        )
        cursor.setDate(cursor.getDate() + step)
      }
      break
    }
  }

  return dates
}

export default function CalendarioPage() {
  const today = new Date()
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [bills, setBills] = useState<DueBill[]>([])
  const [fixedAccounts, setFixedAccounts] = useState<FixedAccount[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<Transaction[]>(
    [],
  )
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [imovelPagamentos, setImovelPagamentos] = useState<
    Record<string, ImovelPagamento[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<DueBill | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
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
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [billsRes, fixedRes, txRes, imoveisRes] = await Promise.all([
        fetch('/api/due-bills'),
        fetch('/api/fixed-accounts'),
        fetch('/api/transactions'),
        fetch('/api/imoveis'),
      ])
      const billsData = await billsRes.json()
      const fixedData = await fixedRes.json()
      const txData = await txRes.json()
      const imoveisData = await imoveisRes.json()
      setBills(billsData.dueBills || [])
      setFixedAccounts(fixedData.fixedAccounts || [])
      const recurring = (txData.transactions || []).filter(
        (t: Transaction) => t.recurring_rule,
      )
      setRecurringTransactions(recurring)
      const imoveisList: Imovel[] = imoveisData.imoveis || []
      setImoveis(imoveisList)
      const pagamentosMap: Record<string, ImovelPagamento[]> = {}
      await Promise.all(
        imoveisList.map(async (im) => {
          try {
            const r = await fetch(`/api/imoveis/${im.id}/pagamentos`)
            const p = await r.json()
            pagamentosMap[im.id] = p.pagamentos || []
          } catch {
            pagamentosMap[im.id] = []
          }
        }),
      )
      setImovelPagamentos(pagamentosMap)
    } catch (err) {
      console.error('Load calendar error:', err)
    } finally {
      setLoading(false)
    }
  }

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()
  const monthStart = useMemo(() => new Date(year, monthIndex, 1), [year, monthIndex])
  const monthEnd = useMemo(
    () => new Date(year, monthIndex + 1, 0),
    [year, monthIndex],
  )
  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    for (const bill of bills) {
      const d = bill.due_date.slice(0, 10)
      const date = parseIsoDate(d)
      if (date < monthStart || date > monthEnd) continue
      const event: CalendarEvent = {
        kind: 'bill',
        id: bill.id,
        date: d,
        title: bill.title,
        amount: Number(bill.amount),
        status: bill.status,
        category: bill.category,
        isOverdue: !!bill.isOverdue,
        raw: bill,
      }
      const arr = map.get(d) ?? []
      arr.push(event)
      map.set(d, arr)
    }

    for (const acc of fixedAccounts) {
      const dates = projectFixedAccount(acc, monthStart, monthEnd)
      for (const d of dates) {
        const event: CalendarEvent = {
          kind: 'fixed',
          id: `${acc.id}-${d}`,
          date: d,
          title: acc.name,
          amount: Number(acc.amount),
          category: acc.category,
          frequency: acc.frequency,
          fixedType: acc.type === 'income' ? 'income' : 'expense',
          raw: acc,
        }
        const arr = map.get(d) ?? []
        arr.push(event)
        map.set(d, arr)
      }
    }

    for (const tx of recurringTransactions) {
      if (!tx.recurring_rule) continue
      const dates = projectTransaction(tx, monthStart, monthEnd)
      for (const d of dates) {
        const event: CalendarEvent = {
          kind: 'transaction',
          id: `${tx.id}-${d}`,
          date: d,
          title: tx.description || tx.category || 'Transação recorrente',
          amount: Number(tx.amount),
          category: tx.category ?? undefined,
          rule: tx.recurring_rule,
          txType: tx.type,
          raw: tx,
        }
        const arr = map.get(d) ?? []
        arr.push(event)
        map.set(d, arr)
      }
    }

    const monthRef = isoDate(year, monthIndex, 1)
    for (const im of imoveis) {
      if (im.status !== 'alugado') continue
      if (!im.dia_vencimento) continue
      const day = clampDayToMonth(year, monthIndex, im.dia_vencimento)
      const d = isoDate(year, monthIndex, day)
      const pagamentos = imovelPagamentos[im.id] || []
      const pagamentoMes = pagamentos.find(
        (p) => p.mes_referencia?.slice(0, 10) === monthRef,
      )
      const pago = pagamentoMes?.status === 'pago'
      const isOverdue = !pago && d < todayIso
      const taxa = im.taxa_admin_pct ?? 0
      const valorBruto = Number(im.valor_aluguel)
      const valorLiquido = valorBruto * (1 - taxa / 100)
      const event: CalendarEvent = {
        kind: 'imovel',
        id: `imovel-${im.id}-${d}`,
        date: d,
        title: im.apelido,
        amount: valorBruto,
        amountLiquido: valorLiquido,
        pago,
        isOverdue,
        mesReferencia: monthRef,
        raw: im,
        pagamento: pagamentoMes ?? null,
      }
      const arr = map.get(d) ?? []
      arr.push(event)
      map.set(d, arr)
    }

    return map
  }, [
    bills,
    fixedAccounts,
    recurringTransactions,
    imoveis,
    imovelPagamentos,
    monthStart,
    monthEnd,
    year,
    monthIndex,
    todayIso,
  ])

  const monthSummary = useMemo(() => {
    let totalMonth = 0
    let overdue = 0
    let pending = 0
    let paid = 0
    let fixedExpense = 0
    let incomeMonth = 0

    for (const events of eventsByDay.values()) {
      for (const ev of events) {
        if (ev.kind === 'bill') {
          if (ev.status === 'pending' || ev.isOverdue) totalMonth += ev.amount
          if (ev.isOverdue) overdue += 1
          if (ev.status === 'pending' && !ev.isOverdue) pending += 1
          if (ev.status === 'paid') paid += 1
        }
        if (ev.kind === 'fixed') {
          if (ev.fixedType === 'income') {
            incomeMonth += ev.amount
          } else {
            totalMonth += ev.amount
            fixedExpense += ev.amount
          }
        }
        if (ev.kind === 'imovel') {
          incomeMonth += ev.amount
        }
        if (ev.kind === 'transaction') {
          if (ev.txType === 'income') {
            incomeMonth += ev.amount
          } else if (ev.txType === 'expense') {
            totalMonth += ev.amount
            fixedExpense += ev.amount
          }
        }
      }
    }

    return { totalMonth, overdue, pending, paid, fixedExpense, incomeMonth }
  }, [eventsByDay])

  const calendarCells = useMemo(() => {
    const firstWeekday = monthStart.getDay()
    const totalDays = monthEnd.getDate()
    const cells: Array<{ iso: string | null; day: number | null }> = []
    for (let i = 0; i < firstWeekday; i++) cells.push({ iso: null, day: null })
    for (let d = 1; d <= totalDays; d++)
      cells.push({ iso: isoDate(year, monthIndex, d), day: d })
    while (cells.length % 7 !== 0) cells.push({ iso: null, day: null })
    return cells
  }, [monthStart, monthEnd, year, monthIndex])

  const listBills = useMemo(() => {
    if (filterStatus === 'all') return bills
    return bills.filter((b) => {
      if (filterStatus === 'overdue') return b.isOverdue
      return b.status === filterStatus
    })
  }, [bills, filterStatus])

  const selectedDayEvents = selectedDay
    ? [...(eventsByDay.get(selectedDay) ?? [])].sort((a, b) =>
        a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === 'bill' ? -1 : 1,
      )
    : []

  const resetForm = () =>
    setFormData({
      title: '',
      amount: '',
      due_date: '',
      category: '',
      description: '',
      reminder_days: '0',
    })

  const openCreate = (prefillDate?: string) => {
    resetForm()
    setSelectedBill(null)
    if (prefillDate) {
      setFormData((f) => ({ ...f, due_date: prefillDate }))
    }
    setShowCreateModal(true)
  }

  const openEdit = (bill: DueBill) => {
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
  }

  const openPayment = (bill: DueBill) => {
    setSelectedBill(bill)
    setPaymentData({
      amount_paid: bill.amount.toString(),
      payment_method: '',
      notes: '',
    })
    setShowPaymentModal(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedBill
        ? `/api/due-bills/${selectedBill.id}`
        : '/api/due-bills'
      const method = selectedBill ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          category: formData.category || null,
          description: formData.description || null,
          reminder_days: parseInt(formData.reminder_days || '0', 10),
        }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setSelectedBill(null)
        resetForm()
        await load()
      }
    } catch (err) {
      console.error('Create/edit error:', err)
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
        setShowPaymentModal(false)
        setSelectedBill(null)
        setPaymentData({ amount_paid: '', payment_method: '', notes: '' })
        await load()
      }
    } catch (err) {
      console.error('Payment error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta conta? Você pode restaurá-la pela lixeira.')) return
    try {
      const res = await fetch(`/api/due-bills/${id}`, { method: 'DELETE' })
      if (res.ok) await load()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleMarkImovelPago = async (ev: Extract<CalendarEvent, { kind: 'imovel' }>) => {
    const im = ev.raw
    const taxa = im.taxa_admin_pct ?? 0
    const valorBruto = Number(im.valor_aluguel)
    const valorLiquido = valorBruto * (1 - taxa / 100)
    const hoje = isoDate(today.getFullYear(), today.getMonth(), today.getDate())
    try {
      const res = await fetch(`/api/imoveis/${im.id}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesReferencia: ev.mesReferencia,
          valorBruto,
          valorLiquido,
          dataPagamento: hoje,
          status: 'pago',
        }),
      })
      if (res.ok) await load()
    } catch (err) {
      console.error('Mark imovel pago error:', err)
    }
  }

  const handleUnmarkImovelPago = async (ev: Extract<CalendarEvent, { kind: 'imovel' }>) => {
    const im = ev.raw
    const taxa = im.taxa_admin_pct ?? 0
    const valorBruto = Number(im.valor_aluguel)
    const valorLiquido = valorBruto * (1 - taxa / 100)
    try {
      const res = await fetch(`/api/imoveis/${im.id}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesReferencia: ev.mesReferencia,
          valorBruto,
          valorLiquido,
          status: 'pendente',
        }),
      })
      if (res.ok) await load()
    } catch (err) {
      console.error('Unmark imovel pago error:', err)
    }
  }

  const goPrev = () => setCursor(new Date(year, monthIndex - 1, 1))
  const goNext = () => setCursor(new Date(year, monthIndex + 1, 1))
  const goToday = () =>
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Calendário financeiro
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xl leading-relaxed">
            Visão do mês com contas a vencer e recorrências. Clique em um dia
            para ver os lançamentos previstos.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Nova conta
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="A pagar este mês"
          value={formatBRL(monthSummary.totalMonth)}
          icon={CircleDollarSign}
          accent="text-[var(--color-primary)]"
          subtle="bg-[var(--color-primary-subtle)]"
        />
        <SummaryCard
          label="Vencidas"
          value={String(monthSummary.overdue)}
          icon={AlertTriangle}
          accent={
            monthSummary.overdue > 0
              ? 'text-[var(--color-danger)]'
              : 'text-[var(--color-text-muted)]'
          }
          subtle={
            monthSummary.overdue > 0
              ? 'bg-[var(--color-danger-subtle)]'
              : 'bg-[var(--color-bg-elevated)]'
          }
        />
        <SummaryCard
          label="Pendentes"
          value={String(monthSummary.pending)}
          icon={Receipt}
          accent="text-[var(--color-gold)]"
          subtle="bg-[var(--color-gold-subtle)]"
        />
        <SummaryCard
          label={monthSummary.incomeMonth > 0 ? 'Receitas previstas' : 'Recorrências fixas'}
          value={formatBRL(
            monthSummary.incomeMonth > 0
              ? monthSummary.incomeMonth
              : monthSummary.fixedExpense,
          )}
          icon={monthSummary.incomeMonth > 0 ? TrendingUp : Repeat}
          accent={
            monthSummary.incomeMonth > 0
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-text)]'
          }
          subtle={
            monthSummary.incomeMonth > 0
              ? 'bg-[var(--color-success-subtle)]'
              : 'bg-[var(--color-bg-elevated)]'
          }
        />
      </section>

      {viewMode === 'calendar' ? (
        <section className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="btn-ghost !p-2"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="btn-ghost !p-2"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="btn-ghost !py-1.5 !px-3 text-xs"
              >
                Hoje
              </button>
            </div>
            <div className="text-sm font-medium capitalize">
              {MONTHS[monthIndex]} {year}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)] py-1"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell.iso) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square rounded-lg opacity-0"
                  />
                )
              }
              const events = eventsByDay.get(cell.iso) ?? []
              const isToday = cell.iso === todayIso
              const hasOverdue = events.some(
                (e) => e.kind === 'bill' && e.isOverdue,
              )
              const hasPending = events.some(
                (e) => e.kind === 'bill' && e.status === 'pending' && !e.isOverdue,
              )
              const hasPaid = events.some(
                (e) => e.kind === 'bill' && e.status === 'paid',
              )
              const hasFixedExpense = events.some(
                (e) =>
                  (e.kind === 'fixed' && e.fixedType === 'expense') ||
                  (e.kind === 'transaction' && e.txType === 'expense'),
              )
              const hasIncome = events.some(
                (e) =>
                  (e.kind === 'fixed' && e.fixedType === 'income') ||
                  (e.kind === 'transaction' && e.txType === 'income'),
              )
              const hasImovelPago = events.some(
                (e) => e.kind === 'imovel' && e.pago,
              )
              const hasImovelPendente = events.some(
                (e) => e.kind === 'imovel' && !e.pago && !e.isOverdue,
              )
              const hasImovelAtrasado = events.some(
                (e) => e.kind === 'imovel' && e.isOverdue,
              )
              const dayExpense = events.reduce((sum, e) => {
                if (e.kind === 'bill' && e.status === 'paid') return sum
                if (e.kind === 'fixed' && e.fixedType === 'income') return sum
                if (e.kind === 'transaction' && e.txType !== 'expense') return sum
                if (e.kind === 'imovel') return sum
                return sum + e.amount
              }, 0)
              const dayIncome = events.reduce((sum, e) => {
                if (e.kind === 'fixed' && e.fixedType === 'income') return sum + e.amount
                if (e.kind === 'transaction' && e.txType === 'income') return sum + e.amount
                if (e.kind === 'imovel') return sum + e.amount
                return sum
              }, 0)

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDay(cell.iso)}
                  className={`aspect-square rounded-lg p-1.5 text-left flex flex-col gap-1 border transition-colors ${
                    isToday
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
                      : events.length > 0
                        ? 'border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-primary)]'
                        : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]'
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-text)]'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex-1 flex flex-col justify-end gap-0.5">
                    {dayIncome > 0 && (
                      <span className="text-[9px] sm:text-[10px] leading-tight text-[var(--color-success)] truncate">
                        + {formatBRL(dayIncome)}
                      </span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-[9px] sm:text-[10px] leading-tight text-[var(--color-text-muted)] truncate">
                        {formatBRL(dayExpense)}
                      </span>
                    )}
                    <div className="flex gap-0.5 items-center flex-wrap">
                      {hasOverdue && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]"
                          aria-label="Vencida"
                        />
                      )}
                      {hasPending && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"
                          aria-label="Pendente"
                        />
                      )}
                      {hasFixedExpense && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                          aria-label="Recorrência"
                        />
                      )}
                      {hasIncome && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"
                          aria-label="Receita prevista"
                        />
                      )}
                      {hasPaid && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] ring-1 ring-[var(--color-card)]"
                          aria-label="Pago"
                        />
                      )}
                      {hasImovelAtrasado && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] ring-1 ring-[var(--color-card)]"
                          aria-label="Aluguel atrasado"
                        />
                      )}
                      {hasImovelPendente && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] ring-1 ring-[var(--color-card)]"
                          aria-label="Aluguel a receber"
                        />
                      )}
                      {hasImovelPago && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] ring-1 ring-[var(--color-card)]"
                          aria-label="Aluguel recebido"
                        />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-[var(--color-text-muted)]">
            <LegendDot color="var(--color-danger)" label="Vencida" />
            <LegendDot color="var(--color-gold)" label="Pendente" />
            <LegendDot color="var(--color-primary)" label="Despesa fixa" />
            <LegendDot color="var(--color-success)" label="Receita prevista" />
            <LegendDot color="var(--color-gold)" label="Aluguel" />
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-[var(--color-text-muted)]">
              {listBills.length}{' '}
              {listBills.length === 1 ? 'conta' : 'contas'}
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-base text-sm !py-2 !px-3"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Vencidas</option>
              <option value="paid">Pagas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          {loading ? (
            <div className="card p-10 text-center text-sm text-[var(--color-text-muted)]">
              Carregando…
            </div>
          ) : listBills.length === 0 ? (
            <div className="card p-10 text-center text-sm text-[var(--color-text-muted)]">
              Nenhuma conta cadastrada neste filtro.
            </div>
          ) : (
            <div className="space-y-2">
              {listBills.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onEdit={() => openEdit(bill)}
                  onPay={() => openPayment(bill)}
                  onDelete={() => handleDelete(bill.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedDay && (
        <DayModal
          day={selectedDay}
          events={selectedDayEvents}
          onClose={() => setSelectedDay(null)}
          onCreateBill={() => {
            setSelectedDay(null)
            openCreate(selectedDay)
          }}
          onPayBill={(bill) => {
            setSelectedDay(null)
            openPayment(bill)
          }}
          onEditBill={(bill) => {
            setSelectedDay(null)
            openEdit(bill)
          }}
          onMarkImovelPago={handleMarkImovelPago}
          onUnmarkImovelPago={handleUnmarkImovelPago}
        />
      )}

      {showCreateModal && (
        <CreateModal
          editing={!!selectedBill}
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedBill(null)
          }}
          onSubmit={handleCreateSubmit}
        />
      )}

      {showPaymentModal && selectedBill && (
        <PaymentModal
          bill={selectedBill}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedBill(null)
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
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
  icon: typeof CircleDollarSign
  accent: string
  subtle: string
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${subtle}`}
      >
        <Icon className={`w-5 h-5 ${accent}`} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <p className={`text-lg font-semibold truncate ${accent}`}>{value}</p>
      </div>
    </div>
  )
}

function BillRow({
  bill,
  onEdit,
  onPay,
  onDelete,
}: {
  bill: DueBill
  onEdit: () => void
  onPay: () => void
  onDelete: () => void
}) {
  const overdue = bill.isOverdue
  const paid = bill.status === 'paid'
  const accent = paid
    ? 'text-[var(--color-success)]'
    : overdue
      ? 'text-[var(--color-danger)]'
      : 'text-[var(--color-gold)]'
  const dotBg = paid
    ? 'bg-[var(--color-success-subtle)]'
    : overdue
      ? 'bg-[var(--color-danger-subtle)]'
      : 'bg-[var(--color-gold-subtle)]'

  return (
    <div className="card card-hover p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${dotBg}`}
      >
        {paid ? (
          <CheckCircle2 className={`w-5 h-5 ${accent}`} />
        ) : overdue ? (
          <AlertTriangle className={`w-5 h-5 ${accent}`} />
        ) : (
          <Receipt className={`w-5 h-5 ${accent}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{bill.title}</p>
          {bill.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {bill.category}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Vence em{' '}
          {new Date(bill.due_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          {bill.daysUntilDue !== undefined && !paid && (
            <>
              {' · '}
              {bill.daysUntilDue < 0
                ? `${Math.abs(bill.daysUntilDue)} dias atrás`
                : bill.daysUntilDue === 0
                  ? 'hoje'
                  : `em ${bill.daysUntilDue} dias`}
            </>
          )}
        </p>
      </div>
      <div className="text-right hidden sm:block">
        <p className={`text-sm font-semibold ${accent}`}>
          {formatBRL(bill.amount)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {!paid && (
          <button
            type="button"
            onClick={onPay}
            className="btn-ghost !py-1.5 !px-3 text-xs"
          >
            Pagar
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
          aria-label="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)] text-[var(--color-text-muted)]"
          aria-label="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function DayModal({
  day,
  events,
  onClose,
  onCreateBill,
  onPayBill,
  onEditBill,
  onMarkImovelPago,
  onUnmarkImovelPago,
}: {
  day: string
  events: CalendarEvent[]
  onClose: () => void
  onCreateBill: () => void
  onPayBill: (bill: DueBill) => void
  onEditBill: (bill: DueBill) => void
  onMarkImovelPago: (ev: Extract<CalendarEvent, { kind: 'imovel' }>) => void
  onUnmarkImovelPago: (ev: Extract<CalendarEvent, { kind: 'imovel' }>) => void
}) {
  const date = parseIsoDate(day)
  const totalExpense = events.reduce((sum, e) => {
    if (e.kind === 'bill' && e.status === 'paid') return sum
    if (e.kind === 'fixed' && e.fixedType === 'income') return sum
    if (e.kind === 'transaction' && e.txType !== 'expense') return sum
    if (e.kind === 'imovel') return sum
    return sum + e.amount
  }, 0)
  const totalIncome = events.reduce((sum, e) => {
    if (e.kind === 'fixed' && e.fixedType === 'income') return sum + e.amount
    if (e.kind === 'transaction' && e.txType === 'income') return sum + e.amount
    if (e.kind === 'imovel') return sum + e.amount
    return sum
  }, 0)

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card p-0 w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--color-border)] flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
              {date.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <h2 className="text-xl font-semibold capitalize mt-0.5">
              {date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            {(totalExpense > 0 || totalIncome > 0) && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {totalIncome > 0 && (
                  <span>
                    Entradas:{' '}
                    <span className="font-medium text-[var(--color-success)]">
                      {formatBRL(totalIncome)}
                    </span>
                  </span>
                )}
                {totalExpense > 0 && (
                  <span>
                    Saídas:{' '}
                    <span className="font-medium text-[var(--color-text)]">
                      {formatBRL(totalExpense)}
                    </span>
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
              Nenhum lançamento neste dia.
            </p>
          ) : (
            events.map((ev) => {
              if (ev.kind === 'bill') {
                const paid = ev.status === 'paid'
                const overdue = ev.isOverdue
                const accent = paid
                  ? 'text-[var(--color-success)]'
                  : overdue
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-gold)]'
                const subtle = paid
                  ? 'bg-[var(--color-success-subtle)]'
                  : overdue
                    ? 'bg-[var(--color-danger-subtle)]'
                    : 'bg-[var(--color-gold-subtle)]'
                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] flex items-center gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${subtle}`}
                    >
                      {paid ? (
                        <CheckCircle2 className={`w-4 h-4 ${accent}`} />
                      ) : overdue ? (
                        <AlertTriangle className={`w-4 h-4 ${accent}`} />
                      ) : (
                        <Receipt className={`w-4 h-4 ${accent}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {paid ? 'Paga' : overdue ? 'Vencida' : 'Pendente'}
                        {ev.category ? ` · ${ev.category}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-semibold ${accent}`}>
                        {formatBRL(ev.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        {!paid && (
                          <button
                            type="button"
                            onClick={() => onPayBill(ev.raw)}
                            className="text-[11px] px-2 py-1 rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                          >
                            Pagar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditBill(ev.raw)}
                          className="text-[11px] px-2 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }
              if (ev.kind === 'fixed') {
                const isIncome = ev.fixedType === 'income'
                const accent = isIncome
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-primary)]'
                const subtle = isIncome
                  ? 'bg-[var(--color-success-subtle)]'
                  : 'bg-[var(--color-primary-subtle)]'
                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] flex items-center gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${subtle}`}
                    >
                      {isIncome ? (
                        <TrendingUp className={`w-4 h-4 ${accent}`} />
                      ) : (
                        <Repeat className={`w-4 h-4 ${accent}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {isIncome ? 'Receita prevista' : 'Despesa fixa'} ·{' '}
                        {FREQUENCY_LABEL[ev.frequency]}
                        {ev.category ? ` · ${ev.category}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${accent}`}>
                      {isIncome ? '+ ' : ''}
                      {formatBRL(ev.amount)}
                    </span>
                  </div>
                )
              }
              if (ev.kind === 'imovel') {
                const accent = ev.pago
                  ? 'text-[var(--color-success)]'
                  : ev.isOverdue
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-gold)]'
                const subtle = ev.pago
                  ? 'bg-[var(--color-success-subtle)]'
                  : ev.isOverdue
                    ? 'bg-[var(--color-danger-subtle)]'
                    : 'bg-[var(--color-gold-subtle)]'
                const statusLabel = ev.pago
                  ? 'Aluguel recebido'
                  : ev.isOverdue
                    ? 'Aluguel atrasado'
                    : 'Aluguel a receber'
                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] flex items-center gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${subtle}`}
                    >
                      <Building2 className={`w-4 h-4 ${accent}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {statusLabel}
                        {ev.raw.inquilino_nome ? ` · ${ev.raw.inquilino_nome}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-semibold ${accent}`}>
                        + {formatBRL(ev.amount)}
                      </span>
                      {ev.pago ? (
                        <button
                          type="button"
                          onClick={() => onUnmarkImovelPago(ev)}
                          className="text-[11px] px-2 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
                        >
                          Desmarcar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onMarkImovelPago(ev)}
                          className="text-[11px] px-2 py-1 rounded-md bg-[var(--color-success)] text-white hover:opacity-90"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </div>
                  </div>
                )
              }
              const isIncome = ev.txType === 'income'
              const isTransfer = ev.txType === 'transfer'
              const accent = isIncome
                ? 'text-[var(--color-success)]'
                : isTransfer
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-danger)]'
              const subtle = isIncome
                ? 'bg-[var(--color-success-subtle)]'
                : isTransfer
                  ? 'bg-[var(--color-primary-subtle)]'
                  : 'bg-[var(--color-danger-subtle)]'
              const sign = isIncome ? '+ ' : isTransfer ? '' : '- '
              const label = isIncome
                ? 'Receita recorrente'
                : isTransfer
                  ? 'Transferência recorrente'
                  : 'Despesa recorrente'
              return (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-[var(--color-border)] flex items-center gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${subtle}`}
                  >
                    <Repeat className={`w-4 h-4 ${accent}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {label} · {TX_RULE_LABEL[ev.rule]}
                      {ev.category ? ` · ${ev.category}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${accent}`}>
                    {sign}
                    {formatBRL(ev.amount)}
                  </span>
                </div>
              )
            })
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onCreateBill}
            className="btn-ghost w-full inline-flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Adicionar conta neste dia
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateModal({
  editing,
  formData,
  setFormData,
  onClose,
  onSubmit,
}: {
  editing: boolean
  formData: {
    title: string
    amount: string
    due_date: string
    category: string
    description: string
    reminder_days: string
  }
  setFormData: (d: {
    title: string
    amount: string
    due_date: string
    category: string
    description: string
    reminder_days: string
  }) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Editar conta' : 'Nova conta a vencer'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Descrição*
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-base w-full"
              placeholder="Conta de luz, aluguel…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                Valor*
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="input-base w-full"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                Vencimento*
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="input-base w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Categoria
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="input-base w-full"
              placeholder="Moradia, serviços, saúde…"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Observações
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-base w-full resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Avisar com (dias de antecedência)
            </label>
            <input
              type="number"
              min="0"
              value={formData.reminder_days}
              onChange={(e) =>
                setFormData({ ...formData, reminder_days: e.target.value })
              }
              className="input-base w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 text-sm"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 text-sm">
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PaymentModal({
  bill,
  paymentData,
  setPaymentData,
  onClose,
  onSubmit,
}: {
  bill: DueBill
  paymentData: {
    amount_paid: string
    payment_method: string
    notes: string
  }
  setPaymentData: (d: {
    amount_paid: string
    payment_method: string
    notes: string
  }) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">Registrar pagamento</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-4">
          <p className="text-xs text-[var(--color-text-muted)]">{bill.title}</p>
          <p className="text-base font-semibold mt-0.5">
            {formatBRL(bill.amount)}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Valor pago*
            </label>
            <input
              type="number"
              step="0.01"
              value={paymentData.amount_paid}
              onChange={(e) =>
                setPaymentData({ ...paymentData, amount_paid: e.target.value })
              }
              className="input-base w-full"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Método
            </label>
            <select
              value={paymentData.payment_method}
              onChange={(e) =>
                setPaymentData({ ...paymentData, payment_method: e.target.value })
              }
              className="input-base w-full"
            >
              <option value="">—</option>
              <option value="pix">Pix</option>
              <option value="bank_transfer">Transferência</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Observações
            </label>
            <textarea
              value={paymentData.notes}
              onChange={(e) =>
                setPaymentData({ ...paymentData, notes: e.target.value })
              }
              className="input-base w-full resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 text-sm"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 text-sm">
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
