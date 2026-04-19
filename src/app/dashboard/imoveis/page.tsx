'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Building2,
  Home,
  Store,
  MapPin,
  User,
  Phone,
  Calendar as CalIcon,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import type { Imovel, ImovelPagamento, ImovelTipo, ImovelStatus } from '@/types'

const TIPO_META: Record<ImovelTipo, { label: string; icon: any }> = {
  kitnet: { label: 'Kitnet', icon: Home },
  apartamento: { label: 'Apartamento', icon: Building2 },
  casa: { label: 'Casa', icon: Home },
  comercial: { label: 'Comercial', icon: Store },
  terreno: { label: 'Terreno', icon: MapPin },
  outro: { label: 'Outro', icon: Building2 },
}

const STATUS_META: Record<ImovelStatus, { label: string; color: string; bg: string }> = {
  alugado: { label: 'Alugado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  vago: { label: 'Vago', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  reforma: { label: 'Em reforma', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtDate = (d?: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

function currentMonthRef(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function liquidoDe(bruto: number, taxaPct: number | null | undefined): number {
  const t = taxaPct ?? 0
  return bruto * (1 - t / 100)
}

function diasAte(d?: string | null): number | null {
  if (!d) return null
  const target = new Date(d + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

interface FormState {
  apelido: string
  tipo: ImovelTipo
  endereco: string
  valorImovel: string
  valorAluguel: string
  diaVencimento: string
  taxaAdminPct: string
  inquilinoNome: string
  inquilinoTelefone: string
  inquilinoObservacoes: string
  contratoInicio: string
  contratoFim: string
  dataReajuste: string
  status: ImovelStatus
}

const emptyForm: FormState = {
  apelido: '',
  tipo: 'apartamento',
  endereco: '',
  valorImovel: '',
  valorAluguel: '',
  diaVencimento: '',
  taxaAdminPct: '',
  inquilinoNome: '',
  inquilinoTelefone: '',
  inquilinoObservacoes: '',
  contratoInicio: '',
  contratoFim: '',
  dataReajuste: '',
  status: 'alugado',
}

export default function ImoveisPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [pagamentosPorImovel, setPagamentosPorImovel] = useState<Record<string, ImovelPagamento[]>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Imovel | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadImoveis()
  }, [])

  async function loadImoveis() {
    setLoading(true)
    try {
      const res = await fetch('/api/imoveis')
      const data = await res.json()
      setImoveis(data.imoveis || [])
      // carrega pagamentos de cada um
      const all: Record<string, ImovelPagamento[]> = {}
      await Promise.all(
        (data.imoveis || []).map(async (im: Imovel) => {
          const r = await fetch(`/api/imoveis/${im.id}/pagamentos`)
          const p = await r.json()
          all[im.id] = p.pagamentos || []
        })
      )
      setPagamentosPorImovel(all)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(im: Imovel) {
    setEditing(im)
    setForm({
      apelido: im.apelido,
      tipo: im.tipo,
      endereco: im.endereco || '',
      valorImovel: im.valor_imovel?.toString() || '',
      valorAluguel: im.valor_aluguel.toString(),
      diaVencimento: im.dia_vencimento?.toString() || '',
      taxaAdminPct: im.taxa_admin_pct?.toString() || '',
      inquilinoNome: im.inquilino_nome || '',
      inquilinoTelefone: im.inquilino_telefone || '',
      inquilinoObservacoes: im.inquilino_observacoes || '',
      contratoInicio: im.contrato_inicio || '',
      contratoFim: im.contrato_fim || '',
      dataReajuste: im.data_reajuste || '',
      status: im.status,
    })
    setShowModal(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      apelido: form.apelido,
      tipo: form.tipo,
      endereco: form.endereco || null,
      valorImovel: form.valorImovel ? parseFloat(form.valorImovel) : null,
      valorAluguel: parseFloat(form.valorAluguel),
      diaVencimento: form.diaVencimento ? parseInt(form.diaVencimento) : null,
      taxaAdminPct: form.taxaAdminPct ? parseFloat(form.taxaAdminPct) : 0,
      inquilinoNome: form.inquilinoNome || null,
      inquilinoTelefone: form.inquilinoTelefone || null,
      inquilinoObservacoes: form.inquilinoObservacoes || null,
      contratoInicio: form.contratoInicio || null,
      contratoFim: form.contratoFim || null,
      dataReajuste: form.dataReajuste || null,
      status: form.status,
    }

    const url = editing ? `/api/imoveis/${editing.id}` : '/api/imoveis'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setShowModal(false)
      setEditing(null)
      setForm(emptyForm)
      await loadImoveis()
    }
  }

  async function onDelete(im: Imovel) {
    if (!confirm(`Apagar imóvel "${im.apelido}"?`)) return
    const res = await fetch(`/api/imoveis/${im.id}`, { method: 'DELETE' })
    if (res.ok) await loadImoveis()
  }

  async function marcarPagoMesAtual(im: Imovel) {
    const mesRef = currentMonthRef()
    const bruto = im.valor_aluguel
    const liquido = liquidoDe(bruto, im.taxa_admin_pct)
    const hoje = new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/imoveis/${im.id}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesReferencia: mesRef,
        valorBruto: bruto,
        valorLiquido: liquido,
        dataPagamento: hoje,
        status: 'pago',
      }),
    })
    if (res.ok) await loadImoveis()
  }

  async function desmarcarPagoMesAtual(im: Imovel) {
    const mesRef = currentMonthRef()
    const res = await fetch(`/api/imoveis/${im.id}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesReferencia: mesRef,
        valorBruto: im.valor_aluguel,
        valorLiquido: liquidoDe(im.valor_aluguel, im.taxa_admin_pct),
        status: 'pendente',
      }),
    })
    if (res.ok) await loadImoveis()
  }

  const ativos = imoveis.filter((i) => i.status === 'alugado')
  const patrimonio = imoveis.reduce((s, i) => s + (i.valor_imovel ?? 0), 0)
  const rendaBruta = ativos.reduce((s, i) => s + i.valor_aluguel, 0)
  const rendaLiquida = ativos.reduce((s, i) => s + liquidoDe(i.valor_aluguel, i.taxa_admin_pct), 0)

  const mesRef = currentMonthRef()

  function statusMesAtual(im: Imovel): 'pago' | 'pendente' | 'atrasado' {
    const pgs = pagamentosPorImovel[im.id] || []
    const pg = pgs.find((p) => p.mes_referencia.startsWith(mesRef.slice(0, 7)))
    if (pg?.status === 'pago') return 'pago'
    if (!im.dia_vencimento) return 'pendente'
    const hoje = new Date()
    if (hoje.getDate() > im.dia_vencimento) return 'atrasado'
    return 'pendente'
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Imóveis</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Gestão de imóveis para aluguel, inquilinos, contratos e pagamentos
          </p>
        </div>
        <button onClick={openNew} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo imóvel
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Imóveis</div>
          <div className="text-2xl font-bold text-[var(--text)] mt-1">{imoveis.length}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {ativos.length} alugado{ativos.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Patrimônio</div>
          <div className="text-2xl font-bold text-[var(--text)] mt-1">{fmt(patrimonio)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Renda bruta/mês</div>
          <div className="text-2xl font-bold text-[var(--positive)] mt-1">{fmt(rendaBruta)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Renda líquida/mês</div>
          <div className="text-2xl font-bold text-[var(--positive)] mt-1">{fmt(rendaLiquida)}</div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card p-12 text-center text-[var(--text-muted)]">Carregando…</div>
      ) : imoveis.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text)] mt-4">Nenhum imóvel cadastrado</h3>
          <p className="text-[var(--text-muted)] mt-1">
            Comece registrando seu primeiro imóvel para aluguel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {imoveis.map((im) => {
            const TipoIcon = TIPO_META[im.tipo].icon
            const statusMeta = STATUS_META[im.status]
            const stMes = statusMesAtual(im)
            const diasContrato = diasAte(im.contrato_fim)
            const pagos = (pagamentosPorImovel[im.id] || []).filter((p) => p.status === 'pago')
            const isExpanded = expanded === im.id

            return (
              <div key={im.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(59,130,246,0.15)' }}
                    >
                      <TipoIcon className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-[var(--text)] truncate">
                          {im.apelido}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: statusMeta.color, background: statusMeta.bg }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-0.5">
                        {TIPO_META[im.tipo].label}
                        {im.endereco && ` · ${im.endereco}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(im)}
                      className="p-2 rounded-lg hover:bg-[var(--card-hover)]"
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button
                      onClick={() => onDelete(im)}
                      className="p-2 rounded-lg hover:bg-[var(--card-hover)]"
                      aria-label="Apagar"
                    >
                      <Trash2 className="w-4 h-4 text-[var(--negative)]" />
                    </button>
                  </div>
                </div>

                {/* Aluguel */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      Aluguel
                    </div>
                    <div className="text-lg font-semibold text-[var(--text)] mt-0.5">
                      {fmt(im.valor_aluguel)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      Líquido
                    </div>
                    <div className="text-lg font-semibold text-[var(--positive)] mt-0.5">
                      {fmt(liquidoDe(im.valor_aluguel, im.taxa_admin_pct))}
                    </div>
                    {im.taxa_admin_pct != null && im.taxa_admin_pct > 0 && (
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        Taxa {im.taxa_admin_pct}%
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      Vencimento
                    </div>
                    <div className="text-lg font-semibold text-[var(--text)] mt-0.5">
                      {im.dia_vencimento ? `Dia ${im.dia_vencimento}` : '—'}
                    </div>
                  </div>
                </div>

                {/* Status mês atual */}
                {im.status === 'alugado' && (
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background:
                        stMes === 'pago'
                          ? 'rgba(16,185,129,0.1)'
                          : stMes === 'atrasado'
                          ? 'rgba(239,68,68,0.1)'
                          : 'rgba(245,158,11,0.08)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {stMes === 'pago' ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--positive)]" />
                      ) : stMes === 'atrasado' ? (
                        <AlertTriangle className="w-5 h-5 text-[var(--negative)]" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#F59E0B]" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-[var(--text)]">
                          {stMes === 'pago' && 'Pago este mês'}
                          {stMes === 'pendente' && 'Pendente este mês'}
                          {stMes === 'atrasado' && 'Atrasado'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Referência: {fmtDate(mesRef)}
                        </div>
                      </div>
                    </div>
                    {stMes === 'pago' ? (
                      <button
                        onClick={() => desmarcarPagoMesAtual(im)}
                        className="text-xs px-3 py-1.5 rounded-md hover:bg-[var(--card-hover)] text-[var(--text-muted)]"
                      >
                        Desmarcar
                      </button>
                    ) : (
                      <button
                        onClick={() => marcarPagoMesAtual(im)}
                        className="text-xs px-3 py-1.5 rounded-md bg-[var(--positive)] text-white font-medium"
                      >
                        Marcar como pago
                      </button>
                    )}
                  </div>
                )}

                {/* Inquilino + contrato */}
                <div className="text-sm space-y-1.5 border-t border-[var(--border)] pt-3">
                  {im.inquilino_nome && (
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <User className="w-4 h-4" />
                      <span className="text-[var(--text)]">{im.inquilino_nome}</span>
                      {im.inquilino_telefone && (
                        <>
                          <span>·</span>
                          <Phone className="w-3.5 h-3.5" />
                          <span>{im.inquilino_telefone}</span>
                        </>
                      )}
                    </div>
                  )}
                  {im.contrato_fim && (
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <CalIcon className="w-4 h-4" />
                      <span>Contrato até {fmtDate(im.contrato_fim)}</span>
                      {diasContrato != null && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            diasContrato < 0
                              ? 'text-[var(--negative)]'
                              : diasContrato <= 30
                              ? 'text-[#F59E0B]'
                              : 'text-[var(--text-muted)]'
                          }`}
                          style={{
                            background:
                              diasContrato < 0
                                ? 'rgba(239,68,68,0.1)'
                                : diasContrato <= 30
                                ? 'rgba(245,158,11,0.1)'
                                : 'transparent',
                          }}
                        >
                          {diasContrato < 0
                            ? `vencido há ${-diasContrato}d`
                            : diasContrato === 0
                            ? 'vence hoje'
                            : `${diasContrato}d restantes`}
                        </span>
                      )}
                    </div>
                  )}
                  {im.data_reajuste && (
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <TrendingUp className="w-4 h-4" />
                      <span>Reajuste em {fmtDate(im.data_reajuste)}</span>
                    </div>
                  )}
                </div>

                {/* Histórico */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : im.id)}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  {isExpanded ? 'Ocultar histórico' : `Histórico (${pagos.length} pagos)`}
                </button>
                {isExpanded && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {pagos.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)]">Nenhum pagamento registrado.</div>
                    ) : (
                      pagos.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs text-[var(--text-muted)] py-1.5 border-b border-[var(--border)] last:border-0"
                        >
                          <span>{fmtDate(p.mes_referencia)}</span>
                          <span className="text-[var(--positive)]">{fmt(p.valor_liquido)}</span>
                          <span>{p.data_pagamento ? fmtDate(p.data_pagamento) : '—'}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-[var(--text)]">
                {editing ? 'Editar imóvel' : 'Novo imóvel'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-[var(--card-hover)]">
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Apelido
                  </label>
                  <input
                    type="text"
                    required
                    value={form.apelido}
                    onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                    placeholder="Ex: Kitnet Centro"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as ImovelTipo })}
                    className="input-base w-full"
                  >
                    {Object.entries(TIPO_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Endereço
                </label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  placeholder="Opcional"
                  className="input-base w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Valor do imóvel
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valorImovel}
                    onChange={(e) => setForm({ ...form, valorImovel: e.target.value })}
                    placeholder="0,00"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Aluguel mensal
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.valorAluguel}
                    onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })}
                    placeholder="0,00"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Taxa admin %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.taxaAdminPct}
                    onChange={(e) => setForm({ ...form, taxaAdminPct: e.target.value })}
                    placeholder="0"
                    className="input-base w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Dia do vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.diaVencimento}
                    onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
                    placeholder="1-31"
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ImovelStatus })}
                    className="input-base w-full"
                  >
                    <option value="alugado">Alugado</option>
                    <option value="vago">Vago</option>
                    <option value="reforma">Em reforma</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Inquilino</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={form.inquilinoNome}
                      onChange={(e) => setForm({ ...form, inquilinoNome: e.target.value })}
                      className="input-base w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={form.inquilinoTelefone}
                      onChange={(e) => setForm({ ...form, inquilinoTelefone: e.target.value })}
                      className="input-base w-full"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Observações
                  </label>
                  <textarea
                    value={form.inquilinoObservacoes}
                    onChange={(e) => setForm({ ...form, inquilinoObservacoes: e.target.value })}
                    rows={2}
                    className="input-base w-full resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Contrato</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Início
                    </label>
                    <input
                      type="date"
                      value={form.contratoInicio}
                      onChange={(e) => setForm({ ...form, contratoInicio: e.target.value })}
                      className="input-base w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Fim
                    </label>
                    <input
                      type="date"
                      value={form.contratoFim}
                      onChange={(e) => setForm({ ...form, contratoFim: e.target.value })}
                      className="input-base w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Reajuste
                    </label>
                    <input
                      type="date"
                      value={form.dataReajuste}
                      onChange={(e) => setForm({ ...form, dataReajuste: e.target.value })}
                      className="input-base w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Salvar' : 'Criar imóvel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
