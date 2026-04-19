'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  X,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Loader2,
  Check,
} from 'lucide-react'

type Kind = 'expense' | 'income' | 'transfer'

interface Account {
  id: string
  name: string
  is_private?: boolean
  created_by?: string
}

interface Member {
  id: string
  label: string
}

interface Parsed {
  kind: Kind
  amount: number | null
  description: string
  category?: string
  hintAccount?: string
}

const EXPENSE_VERBS = [
  'gastei',
  'gasto',
  'paguei',
  'comprei',
  'pago',
  'despesa',
  'saiu',
]
const INCOME_VERBS = [
  'recebi',
  'recebido',
  'ganhei',
  'entrou',
  'entrei',
  'renda',
  'receita',
  'salário',
  'salario',
  'aluguel',
]
const TRANSFER_VERBS = ['transferi', 'transferência', 'transferencia']

const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/\b(mercado|supermercado|super)\b/i, 'Mercado'],
  [/\b(uber|99|taxi|táxi|corrida)\b/i, 'Transporte'],
  [/\b(ifood|restaurante|almoç|janta|lanche|pizza)\b/i, 'Alimentação'],
  [/\b(gasolina|combustível|combustivel|posto)\b/i, 'Transporte'],
  [/\b(farmácia|farmacia|remédio|remedio)\b/i, 'Saúde'],
  [/\b(cinema|netflix|spotify|prime|lazer)\b/i, 'Lazer'],
  [/\b(luz|água|agua|internet|fatura|conta)\b/i, 'Contas'],
  [/\b(aluguel|inquilino)\b/i, 'Aluguel'],
  [/\b(salário|salario)\b/i, 'Salário'],
  [/\b(freela|freelance|extra)\b/i, 'Renda extra'],
]

function parseText(raw: string): Parsed {
  const text = raw.trim()
  const lower = text.toLowerCase()

  let kind: Kind = 'expense'
  if (TRANSFER_VERBS.some((v) => lower.includes(v))) kind = 'transfer'
  else if (INCOME_VERBS.some((v) => lower.includes(v))) kind = 'income'
  else if (EXPENSE_VERBS.some((v) => lower.startsWith(v) || lower.includes(` ${v} `))) kind = 'expense'

  // Valor: aceita 45, 45.50, 45,50, 1.250,30, R$ 45
  const valueMatch = text.match(/r?\$?\s*([\d]+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/i)
  let amount: number | null = null
  if (valueMatch) {
    let v = valueMatch[1]
    const hasComma = v.includes(',')
    const hasDot = v.includes('.')
    if (hasComma && hasDot) {
      // 1.250,30 → 1250.30
      v = v.replace(/\./g, '').replace(',', '.')
    } else if (hasComma) {
      v = v.replace(',', '.')
    }
    const n = parseFloat(v)
    if (!isNaN(n)) amount = n
  }

  // Categoria por hint
  let category: string | undefined
  for (const [re, c] of CATEGORY_HINTS) {
    if (re.test(lower)) {
      category = c
      break
    }
  }

  // Descrição: limpa verbo e valor
  let description = text
  for (const v of [...EXPENSE_VERBS, ...INCOME_VERBS, ...TRANSFER_VERBS]) {
    description = description.replace(new RegExp(`\\b${v}\\b`, 'gi'), '').trim()
  }
  if (valueMatch) {
    description = description.replace(valueMatch[0], '').trim()
  }
  description = description.replace(/\s+/g, ' ').replace(/^(de|no|na|em|um|uma)\s+/i, '').trim()

  return { kind, amount, description, category }
}

const KIND_META: Record<Kind, { label: string; icon: any; className: string }> = {
  expense: { label: 'Despesa', icon: ArrowDownRight, className: 'bg-[var(--danger-subtle)] text-[var(--danger)]' },
  income: { label: 'Receita', icon: ArrowUpRight, className: 'bg-[var(--success-subtle)] text-[var(--success)]' },
  transfer: { label: 'Transferência', icon: ArrowLeftRight, className: 'bg-[var(--primary-subtle)] text-[var(--primary)]' },
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function QuickRegister({ open, onClose, onSaved }: Props) {
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<Parsed>({ kind: 'expense', amount: null, description: '' })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [paidBy, setPaidBy] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setRaw('')
    setErr(null)
    setDone(false)
    setTimeout(() => inputRef.current?.focus(), 60)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      const { data: couple } = await supabase
        .from('couples')
        .select('id, primary_user_id, primary_user_email, secondary_user_id, secondary_user_email')
        .or(`primary_user_id.eq.${uid},secondary_user_id.eq.${uid}`)
        .single()
      if (!couple) return
      const { data: accs } = await supabase
        .from('accounts')
        .select('id, name, is_private, created_by')
        .eq('couple_id', couple.id)
        .is('deleted_at', null)
      const visible = (accs || []).filter((a) => !a.is_private || a.created_by === uid)
      setAccounts(visible)
      if (visible.length && !accountId) setAccountId(visible[0].id)
      const m: Member[] = []
      if (couple.primary_user_id) m.push({ id: couple.primary_user_id, label: couple.primary_user_email?.split('@')[0] || 'Titular' })
      if (couple.secondary_user_id) m.push({ id: couple.secondary_user_id, label: couple.secondary_user_email?.split('@')[0] || 'Parceiro(a)' })
      setMembers(m)
      setPaidBy(uid)
    })
  }, [open, accountId])

  useEffect(() => {
    if (!raw.trim()) {
      setParsed({ kind: 'expense', amount: null, description: '' })
      return
    }
    setParsed(parseText(raw))
  }, [raw])

  const handleSave = useCallback(async () => {
    if (!accountId) {
      setErr('Selecione uma conta primeiro.')
      return
    }
    if (!parsed.amount || parsed.amount <= 0) {
      setErr('Informe um valor válido.')
      return
    }
    if (parsed.kind === 'transfer' && !toAccountId) {
      setErr('Escolha a conta de destino.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          amount: parsed.amount,
          type: parsed.kind,
          description: parsed.description || null,
          category: parsed.category || null,
          paidByUserId: paidBy || undefined,
          toAccountId: parsed.kind === 'transfer' ? toAccountId : undefined,
          date: new Date().toISOString().split('T')[0],
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Falha ao registrar')
      }
      setDone(true)
      onSaved?.()
      setTimeout(() => {
        setDone(false)
        onClose()
      }, 700)
    } catch (e: any) {
      setErr(e.message || 'Erro ao registrar')
    } finally {
      setSaving(false)
    }
  }, [accountId, parsed, toAccountId, paidBy, onSaved, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || document.activeElement === inputRef.current)) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, handleSave])

  if (!open) return null

  const meta = KIND_META[parsed.kind]
  const KindIcon = meta.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-[var(--card)] border-t sm:border border-[var(--border)] sm:rounded-2xl shadow-2xl h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            Registro rápido
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          <div>
            <input
              ref={inputRef}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='Ex: "gastei 45 uber" · "recebi 1500 salário" · "paguei 120 mercado"'
              className="input-base w-full text-base h-12"
            />
            <p className="text-[11px] text-[var(--text-subtle)] mt-1.5">
              Digite em português natural. Detectamos tipo, valor e categoria automaticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['expense', 'income', 'transfer'] as Kind[]).map((k) => {
              const m = KIND_META[k]
              const I = m.icon
              const active = parsed.kind === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setParsed({ ...parsed, kind: k })}
                  className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm border transition-colors ${
                    active
                      ? 'border-transparent ' + m.className
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg)]'
                  }`}
                >
                  <I className="w-4 h-4" />
                  {m.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Valor</label>
              <input
                value={parsed.amount ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value.replace(',', '.'))
                  setParsed({ ...parsed, amount: isNaN(v) ? null : v })
                }}
                type="number"
                step="0.01"
                className="input-base w-full h-11 tabular-nums"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Categoria</label>
              <input
                value={parsed.category ?? ''}
                onChange={(e) => setParsed({ ...parsed, category: e.target.value })}
                className="input-base w-full h-11"
                placeholder="ex: Mercado"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Descrição</label>
            <input
              value={parsed.description}
              onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
              className="input-base w-full h-11"
              placeholder="Opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                {parsed.kind === 'transfer' ? 'De' : 'Conta'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="input-base w-full h-11"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {parsed.kind === 'transfer' ? (
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Para</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="input-base w-full h-11"
                >
                  <option value="">Selecione</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              members.length > 1 && (
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Quem {parsed.kind === 'income' ? 'recebeu' : 'pagou'}</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="input-base w-full h-11"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}
          </div>

          {err && (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-subtle)] rounded-xl px-3 py-2">
              {err}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg ${meta.className}`}>
            <KindIcon className="w-3.5 h-3.5" />
            {meta.label}
            {parsed.amount ? ` · R$ ${parsed.amount.toFixed(2).replace('.', ',')}` : ''}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || done}
            className="btn-primary inline-flex items-center justify-center gap-2 h-11 px-5 min-w-[120px] disabled:opacity-60"
          >
            {done ? <><Check className="w-4 h-4" /> Salvo</> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
