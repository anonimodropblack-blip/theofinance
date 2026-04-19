'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Home,
  Car,
  Baby,
  Hourglass,
  Plane,
  Target,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

interface LifeGoal {
  id: string
  category: 'casa' | 'carro' | 'filhos' | 'aposentadoria' | 'viagem' | 'outro'
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  expected_annual_return: number
  notes: string | null
  is_active: boolean
}

const CATEGORY_META: Record<
  LifeGoal['category'],
  { label: string; icon: any; color: string }
> = {
  casa: { label: 'Casa', icon: Home, color: '#3B82F6' },
  carro: { label: 'Carro', icon: Car, color: '#10B981' },
  filhos: { label: 'Filhos', icon: Baby, color: '#F59E0B' },
  aposentadoria: { label: 'Aposentadoria', icon: Hourglass, color: '#8B5CF6' },
  viagem: { label: 'Viagem', icon: Plane, color: '#06B6D4' },
  outro: { label: 'Outro', icon: Target, color: '#EF4444' },
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function calcMonthsUntil(date: string | null): number | null {
  if (!date) return null
  const target = new Date(date)
  const now = new Date()
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  return Math.max(1, months)
}

function calcMonthlyContribution(
  target: number,
  current: number,
  months: number | null,
  annualReturn: number
) {
  const gap = target - current
  if (gap <= 0) return 0
  if (!months || months <= 0) return gap
  const r = annualReturn / 100 / 12
  if (r === 0) return gap / months
  const fv = gap
  const pv = current
  const monthly = (fv - pv * Math.pow(1 + r, months)) / ((Math.pow(1 + r, months) - 1) / r)
  return Math.max(0, monthly)
}

export default function PlanejamentoPage() {
  const [goals, setGoals] = useState<LifeGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LifeGoal | null>(null)

  const loadGoals = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/life-goals')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar')
      setGoals(json.goals || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta meta?')) return
    const res = await fetch(`/api/life-goals/${id}`, { method: 'DELETE' })
    if (res.ok) loadGoals()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
            Planejamento de vida
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Metas de longo prazo com cálculo automático de aporte mensal.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </button>
      </div>

      {error && (
        <div className="card p-4 border-[var(--danger)]/30 bg-[var(--danger-subtle)] text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-[var(--text-muted)] text-sm">Carregando…</div>
      ) : goals.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)] mx-auto mb-3 flex items-center justify-center">
            <Target className="h-5 w-5" />
          </div>
          <div className="text-sm text-[var(--text)] font-medium">Nenhuma meta cadastrada</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Comece registrando um objetivo de médio ou longo prazo.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((g) => {
            const meta = CATEGORY_META[g.category]
            const Icon = meta.icon
            const progress = Math.min(100, (g.current_amount / g.target_amount) * 100)
            const months = calcMonthsUntil(g.target_date)
            const monthly = calcMonthlyContribution(
              g.target_amount,
              g.current_amount,
              months,
              g.expected_annual_return || 6
            )
            return (
              <div key={g.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--text)]">{g.name}</div>
                      <div className="text-xs text-[var(--text-subtle)]">{meta.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(g)
                        setModalOpen(true)
                      }}
                      className="p-2 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-2 rounded-lg text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] mb-1.5">
                    <span>Progresso</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${progress}%`, background: meta.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
                    <span>{fmt(g.current_amount)}</span>
                    <span>{fmt(g.target_amount)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Aporte/mês
                    </div>
                    <div className="text-sm font-medium text-[var(--text)] mt-0.5">
                      {fmt(monthly)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Prazo
                    </div>
                    <div className="text-sm font-medium text-[var(--text)] mt-0.5">
                      {months ? `${months}m` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Rend. a.a.
                    </div>
                    <div className="text-sm font-medium text-[var(--text)] mt-0.5">
                      {g.expected_annual_return?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                </div>

                {g.notes && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                    {g.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <GoalModal
          goal={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            loadGoals()
          }}
        />
      )}
    </div>
  )
}

function GoalModal({
  goal,
  onClose,
  onSaved,
}: {
  goal: LifeGoal | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    category: goal?.category || 'casa',
    name: goal?.name || '',
    targetAmount: goal?.target_amount?.toString() || '',
    currentAmount: goal?.current_amount?.toString() || '0',
    targetDate: goal?.target_date?.split('T')[0] || '',
    expectedAnnualReturn: (goal?.expected_annual_return ?? 6).toString(),
    notes: goal?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      const payload = {
        category: form.category,
        name: form.name.trim(),
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount || 0),
        targetDate: form.targetDate || null,
        expectedAnnualReturn: Number(form.expectedAnnualReturn || 6),
        notes: form.notes.trim() || null,
      }
      if (!payload.name || !payload.targetAmount) {
        throw new Error('Preencha nome e valor alvo')
      }
      const url = goal ? `/api/life-goals/${goal.id}` : '/api/life-goals'
      const method = goal ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h3 className="text-sm font-medium text-[var(--text)]">
            {goal ? 'Editar meta' : 'Nova meta de vida'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
              Categoria
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => {
                const meta = CATEGORY_META[cat]
                const Icon = meta.icon
                const active = form.category === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setForm({ ...form, category: cat })}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors"
                    style={{
                      borderColor: active ? meta.color : 'var(--border)',
                      background: active ? `${meta.color}15` : 'var(--bg-elevated)',
                      color: active ? meta.color : 'var(--text-muted)',
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
              Nome da meta
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Apartamento de 2 quartos"
              className="input-base w-full mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                Valor alvo
              </label>
              <input
                type="number"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="input-base w-full mt-2"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                Já acumulado
              </label>
              <input
                type="number"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                className="input-base w-full mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                Data alvo
              </label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="input-base w-full mt-2"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                Rendimento a.a. (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.expectedAnnualReturn}
                onChange={(e) => setForm({ ...form, expectedAnnualReturn: e.target.value })}
                className="input-base w-full mt-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
              Observações
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="input-base w-full mt-2 resize-none"
              placeholder="Detalhes da meta (opcional)"
            />
          </div>

          {error && (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-subtle)] p-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-ghost text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Salvando…' : goal ? 'Salvar' : 'Criar meta'}
          </button>
        </div>
      </div>
    </div>
  )
}
