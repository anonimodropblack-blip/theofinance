'use client'

import { useMemo } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Building2,
  TrendingUp,
  CircleDollarSign,
  Repeat,
  Clock,
} from 'lucide-react'
import type { FeedItem, FeedItemKind } from '@/app/api/feed/route'

const KIND_CONFIG: Record<
  FeedItemKind,
  { icon: any; label: string; accent: string; bg: string; bar: string }
> = {
  expense: {
    icon: ArrowDownRight,
    label: 'Despesa',
    accent: 'text-[var(--danger)]',
    bg: 'bg-[var(--danger-subtle)]',
    bar: 'bg-[var(--danger)]',
  },
  income: {
    icon: ArrowUpRight,
    label: 'Receita',
    accent: 'text-[var(--success)]',
    bg: 'bg-[var(--success-subtle)]',
    bar: 'bg-[var(--success)]',
  },
  transfer: {
    icon: ArrowLeftRight,
    label: 'Transferência',
    accent: 'text-[var(--text-muted)]',
    bg: 'bg-[var(--bg-elevated)]',
    bar: 'bg-[var(--text-subtle)]',
  },
  rent_received: {
    icon: Building2,
    label: 'Aluguel recebido',
    accent: 'text-[var(--success)]',
    bg: 'bg-[var(--gold-subtle)]',
    bar: 'bg-[var(--gold)]',
  },
  rent_pending: {
    icon: Clock,
    label: 'Aluguel pendente',
    accent: 'text-[var(--gold)]',
    bg: 'bg-[var(--gold-subtle)]',
    bar: 'bg-[var(--gold)]',
  },
  investment: {
    icon: TrendingUp,
    label: 'Aporte',
    accent: 'text-[var(--primary)]',
    bg: 'bg-[var(--primary-subtle)]',
    bar: 'bg-[var(--primary)]',
  },
  debt_payment: {
    icon: CircleDollarSign,
    label: 'Dívida',
    accent: 'text-[var(--danger)]',
    bg: 'bg-[var(--danger-subtle)]',
    bar: 'bg-[var(--danger)]',
  },
  fixed_expense: {
    icon: Repeat,
    label: 'Conta fixa',
    accent: 'text-[var(--text-muted)]',
    bg: 'bg-[var(--primary-subtle)]',
    bar: 'bg-[var(--primary)]',
  },
  fixed_income: {
    icon: Repeat,
    label: 'Receita fixa',
    accent: 'text-[var(--success)]',
    bg: 'bg-[var(--success-subtle)]',
    bar: 'bg-[var(--success)]',
  },
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function formatDateLabel(d: string, today: string, yesterday: string) {
  if (d === today) return 'Hoje'
  if (d === yesterday) return 'Ontem'
  try {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })
  } catch {
    return d
  }
}

function personInitial(personId: string | null | undefined, primaryId?: string, secondaryId?: string) {
  if (!personId) return null
  if (personId === primaryId) return { letter: 'P', tone: 'primary' as const }
  if (personId === secondaryId) return { letter: 'S', tone: 'teal' as const }
  return { letter: '?', tone: 'muted' as const }
}

interface Props {
  items: FeedItem[]
  couple: { primaryId?: string; secondaryId?: string; primaryLabel?: string; secondaryLabel?: string }
  emptyMessage?: string
  onItemClick?: (item: FeedItem) => void
}

export default function FeedList({ items, couple, emptyMessage = 'Nenhum lançamento no período.', onItemClick }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().slice(0, 10)

  const grouped = useMemo(() => {
    const map = new Map<string, FeedItem[]>()
    for (const it of items) {
      const d = it.date.slice(0, 10)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(it)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [items])

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {grouped.map(([date, group]) => {
        const label = formatDateLabel(date, today, yesterday)
        const total = group.reduce((acc, it) => {
          if (it.direction === 'in') return acc + it.amount
          if (it.direction === 'out') return acc - it.amount
          return acc
        }, 0)
        return (
          <div key={date}>
            <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 px-4 py-2 bg-[var(--bg-elevated)]/95 backdrop-blur border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                {label}
              </span>
              <span className={`text-xs tabular-nums ${total >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {total >= 0 ? '+' : ''}{formatBRL(total)}
              </span>
            </div>
            <ul>
              {group.map((it) => {
                const cfg = KIND_CONFIG[it.kind]
                const Icon = cfg.icon
                const p = personInitial(it.personId, couple.primaryId, couple.secondaryId)
                const personLabel =
                  it.personId === couple.primaryId
                    ? couple.primaryLabel
                    : it.personId === couple.secondaryId
                      ? couple.secondaryLabel
                      : null
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick?.(it)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)] transition-colors"
                    >
                      <div className={`relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <span className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${cfg.bar}`} />
                        <Icon className={`w-4 h-4 ${cfg.accent}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text)] truncate">{it.description}</p>
                          {p && (
                            <span
                              className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold shrink-0 ${
                                p.tone === 'primary'
                                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                                  : p.tone === 'teal'
                                    ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                              }`}
                              title={personLabel || ''}
                            >
                              {p.letter}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-subtle)] truncate mt-0.5">
                          {cfg.label}
                          {it.category ? ` · ${it.category}` : ''}
                          {it.accountName ? ` · ${it.accountName}` : ''}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold tabular-nums shrink-0 ${cfg.accent}`}>
                        {it.direction === 'out' ? '-' : it.direction === 'in' ? '+' : ''}
                        {formatBRL(it.amount)}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
