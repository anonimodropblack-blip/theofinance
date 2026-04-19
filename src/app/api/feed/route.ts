import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export type FeedItemKind =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'rent_received'
  | 'rent_pending'
  | 'investment'
  | 'debt_payment'
  | 'fixed_expense'
  | 'fixed_income'

export interface FeedItem {
  id: string
  kind: FeedItemKind
  date: string
  description: string
  amount: number
  direction: 'in' | 'out' | 'neutral'
  category?: string | null
  subcategory?: string | null
  personId?: string | null
  accountId?: string | null
  accountName?: string | null
  source: 'transaction' | 'imovel' | 'investment' | 'debt' | 'fixed_account'
  sourceId: string
  meta?: Record<string, any>
}

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const fromDate = sp.get('from')
    const toDate = sp.get('to')
    const kindFilter = sp.get('kind')
    const personId = sp.get('person')
    const accountId = sp.get('account')
    const search = (sp.get('q') || '').trim().toLowerCase()

    const supabase = await getSupabase()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: couple } = await supabase
      .from('couples')
      .select('id, primary_user_id, secondary_user_id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, is_private, created_by')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)

    const accountMap = new Map<string, { name: string; visible: boolean }>()
    for (const a of accounts || []) {
      accountMap.set(a.id, {
        name: a.name,
        visible: !a.is_private || a.created_by === userData.user.id,
      })
    }
    const visibleIds = Array.from(accountMap.entries())
      .filter(([, v]) => v.visible)
      .map(([id]) => id)

    const items: FeedItem[] = []

    // 1) Transactions
    if (visibleIds.length > 0) {
      let txQ = supabase
        .from('transactions')
        .select('*')
        .eq('couple_id', couple.id)
        .is('deleted_at', null)
        .in('account_id', visibleIds)
      if (fromDate) txQ = txQ.gte('date', fromDate)
      if (toDate) txQ = txQ.lte('date', toDate)
      if (accountId) txQ = txQ.eq('account_id', accountId)

      const { data: txs } = await txQ.order('date', { ascending: false }).limit(300)
      for (const t of txs || []) {
        const acc = accountMap.get(t.account_id)
        const kind: FeedItemKind =
          t.type === 'income' ? 'income' : t.type === 'transfer' ? 'transfer' : 'expense'
        items.push({
          id: `tx-${t.id}`,
          kind,
          date: t.date,
          description: t.description || t.category || (t.type === 'transfer' ? 'Transferência' : 'Lançamento'),
          amount: Number(t.amount),
          direction: kind === 'income' ? 'in' : kind === 'transfer' ? 'neutral' : 'out',
          category: t.category,
          subcategory: t.subcategory,
          personId: t.paid_by_user_id,
          accountId: t.account_id,
          accountName: acc?.name,
          source: 'transaction',
          sourceId: t.id,
          meta: { toAccountId: t.to_account_id, recurringRule: t.recurring_rule },
        })
      }
    }

    // 2) Imovel pagamentos (aluguéis pagos = renda)
    {
      let paymQ = supabase
        .from('imovel_pagamentos')
        .select('*, imoveis(apelido, inquilino_nome)')
        .eq('couple_id', couple.id)
      if (fromDate) paymQ = paymQ.gte('mes_referencia', fromDate)
      if (toDate) paymQ = paymQ.lte('mes_referencia', toDate)
      const { data: payms } = await paymQ.order('mes_referencia', { ascending: false }).limit(150)
      for (const p of payms || []) {
        const imovelName = (p.imoveis as any)?.apelido || 'Imóvel'
        const tenant = (p.imoveis as any)?.inquilino_nome || ''
        const isPaid = p.status === 'pago'
        items.push({
          id: `imo-${p.id}`,
          kind: isPaid ? 'rent_received' : 'rent_pending',
          date: p.data_pagamento || p.mes_referencia,
          description: `Aluguel ${imovelName}${tenant ? ` · ${tenant}` : ''}`,
          amount: Number(p.valor_liquido || p.valor_bruto),
          direction: isPaid ? 'in' : 'neutral',
          category: 'Aluguel',
          source: 'imovel',
          sourceId: p.id,
          meta: { status: p.status, imovelId: p.imovel_id },
        })
      }
    }

    // 3) Investments (aportes = cada investimento como lançamento único na criação)
    {
      const { data: invs } = await supabase
        .from('investments')
        .select('*')
        .eq('couple_id', couple.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)
      for (const i of invs || []) {
        const d = (i.created_at || '').slice(0, 10)
        if (fromDate && d < fromDate) continue
        if (toDate && d > toDate) continue
        items.push({
          id: `inv-${i.id}`,
          kind: 'investment',
          date: d,
          description: `Aporte · ${i.name || i.type}`,
          amount: Number(i.amount_invested || 0),
          direction: 'out',
          category: 'Investimento',
          source: 'investment',
          sourceId: i.id,
          meta: { type: i.type, currentValue: i.current_value },
        })
      }
    }

    // 4) Debts (cada dívida ativa vira um "lançamento" contextual de criação)
    {
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('couple_id', couple.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)
      for (const d of debts || []) {
        const dt = (d.created_at || '').slice(0, 10)
        if (fromDate && dt < fromDate) continue
        if (toDate && dt > toDate) continue
        items.push({
          id: `debt-${d.id}`,
          kind: 'debt_payment',
          date: dt,
          description: `Dívida · ${d.name}${d.creditor ? ` (${d.creditor})` : ''}`,
          amount: Number(d.remaining_amount || d.total_amount || 0),
          direction: 'neutral',
          category: 'Dívida',
          source: 'debt',
          sourceId: d.id,
          meta: { status: d.status, paid: d.installments_paid, total: d.installments_total },
        })
      }
    }

    // Filtros adicionais em memória
    let filtered = items
    if (kindFilter) {
      const kinds = new Set(kindFilter.split(',').map((s) => s.trim()))
      filtered = filtered.filter((i) => kinds.has(i.kind))
    }
    if (personId) {
      filtered = filtered.filter((i) => i.personId === personId)
    }
    if (search) {
      filtered = filtered.filter((i) =>
        [i.description, i.category, i.subcategory, i.accountName]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(search))
      )
    }

    filtered.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))

    return NextResponse.json({
      items: filtered,
      couple: {
        primaryId: couple.primary_user_id,
        secondaryId: couple.secondary_user_id,
      },
    })
  } catch (err: any) {
    console.error('Feed error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
