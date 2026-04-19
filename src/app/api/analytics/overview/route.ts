import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

type Period = 'current_month' | 'last_month' | 'last_3_months' | 'year'

function rangeFor(period: Period): { from: Date; to: Date } {
  const now = new Date()
  if (period === 'current_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    }
  }
  if (period === 'last_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    }
  }
  if (period === 'last_3_months') {
    return { from: new Date(now.getFullYear(), now.getMonth() - 3, 1), to: now }
  }
  return { from: new Date(now.getFullYear(), 0, 1), to: now }
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sp = request.nextUrl.searchParams
    const period = (sp.get('period') as Period) || 'current_month'

    const supabase = createServerClient(
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

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const me = userData.user.id

    const { data: couple } = await supabase
      .from('couples')
      .select('id, primary_user_id, secondary_user_id, primary_user_email, secondary_user_email')
      .or(`primary_user_id.eq.${me},secondary_user_id.eq.${me}`)
      .single()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const { from, to } = rangeFor(period)
    const prev = rangeFor('last_month')

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, type, balance, is_private, created_by, owner')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)
      .or(`is_private.eq.false,created_by.eq.${me}`)

    const visibleIds = (accounts || []).map((a) => a.id)

    const { data: transactions } =
      visibleIds.length > 0
        ? await supabase
            .from('transactions')
            .select('amount, type, category, paid_by_user_id, created_by, date, account_id')
            .eq('couple_id', couple.id)
            .in('account_id', visibleIds)
            .is('deleted_at', null)
            .gte('date', toISO(from))
            .lte('date', toISO(to))
        : { data: [] as Array<{
            amount: number
            type: string
            category: string
            paid_by_user_id: string | null
            created_by: string
            date: string
            account_id: string
          }> }

    const { data: prevTx } =
      visibleIds.length > 0
        ? await supabase
            .from('transactions')
            .select('amount, type, category, paid_by_user_id, created_by')
            .eq('couple_id', couple.id)
            .in('account_id', visibleIds)
            .is('deleted_at', null)
            .gte('date', toISO(prev.from))
            .lte('date', toISO(prev.to))
        : { data: [] as Array<{ amount: number; type: string; category: string; paid_by_user_id: string | null; created_by: string }> }

    const { data: investments } = await supabase
      .from('investments')
      .select('owner_user_id, created_by, asset_type, invested_amount, current_amount')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)

    const { data: fixed } = await supabase
      .from('fixed_accounts')
      .select('amount, frequency, type, created_by, is_active')
      .eq('couple_id', couple.id)

    const primaryId = couple.primary_user_id as string
    const secondaryId = couple.secondary_user_id as string | null

    const initPerson = () => ({
      income: 0,
      expense: 0,
      transactionsCount: 0,
      accountsBalance: 0,
      investmentsCurrent: 0,
      investmentsInvested: 0,
    })

    const byPerson: Record<string, ReturnType<typeof initPerson>> = {
      primary: initPerson(),
      secondary: initPerson(),
    }

    const actorFor = (userId: string | null | undefined): 'primary' | 'secondary' | null => {
      if (!userId) return null
      if (userId === primaryId) return 'primary'
      if (userId === secondaryId) return 'secondary'
      return null
    }

    for (const t of transactions || []) {
      const who = actorFor(t.paid_by_user_id) || actorFor(t.created_by)
      if (!who) continue
      if (t.type === 'income') byPerson[who].income += Number(t.amount || 0)
      else if (t.type === 'expense') byPerson[who].expense += Number(t.amount || 0)
      byPerson[who].transactionsCount += 1
    }

    const byAccountType: Record<string, number> = {}
    for (const a of accounts || []) {
      const who = actorFor(a.created_by)
      if (who) byPerson[who].accountsBalance += Number(a.balance || 0)
      byAccountType[a.type] = (byAccountType[a.type] || 0) + Number(a.balance || 0)
    }

    const byAssetType: Record<string, { invested: number; current: number }> = {}
    for (const i of investments || []) {
      const who = actorFor(i.owner_user_id) || actorFor(i.created_by)
      const invested = Number(i.invested_amount || 0)
      const current = Number(i.current_amount || 0)
      if (who) {
        byPerson[who].investmentsCurrent += current
        byPerson[who].investmentsInvested += invested
      }
      if (!byAssetType[i.asset_type]) byAssetType[i.asset_type] = { invested: 0, current: 0 }
      byAssetType[i.asset_type].invested += invested
      byAssetType[i.asset_type].current += current
    }

    const byCategory: Record<string, { income: number; expense: number }> = {}
    for (const t of transactions || []) {
      const cat = t.category || 'Sem categoria'
      if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 }
      if (t.type === 'income') byCategory[cat].income += Number(t.amount || 0)
      else if (t.type === 'expense') byCategory[cat].expense += Number(t.amount || 0)
    }

    const prevByCategory: Record<string, number> = {}
    let prevTotalExpense = 0
    let prevTotalIncome = 0
    for (const t of prevTx || []) {
      if (t.type === 'expense') {
        prevByCategory[t.category || 'Sem categoria'] =
          (prevByCategory[t.category || 'Sem categoria'] || 0) + Number(t.amount || 0)
        prevTotalExpense += Number(t.amount || 0)
      } else if (t.type === 'income') {
        prevTotalIncome += Number(t.amount || 0)
      }
    }

    const totalIncome = byPerson.primary.income + byPerson.secondary.income
    const totalExpense = byPerson.primary.expense + byPerson.secondary.expense
    const totalNetWorth =
      (accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0) +
      (investments || []).reduce((s, i) => s + Number(i.current_amount || 0), 0)

    const insights: string[] = []

    const p = byPerson.primary
    const s = byPerson.secondary

    if (s.expense > 0 && p.expense > 0) {
      const diff = ((p.expense - s.expense) / s.expense) * 100
      if (Math.abs(diff) > 10) {
        insights.push(
          diff > 0
            ? `Parceiro principal está gastando ${Math.round(diff)}% a mais que o secundário neste período.`
            : `Parceiro secundário está gastando ${Math.round(Math.abs(diff))}% a mais que o principal neste período.`
        )
      }
    }

    if (s.income > 0 && p.income > 0) {
      const diff = ((p.income - s.income) / s.income) * 100
      if (Math.abs(diff) > 15) {
        insights.push(
          diff > 0
            ? `Principal contribui ${Math.round(diff)}% a mais em receita.`
            : `Secundário contribui ${Math.round(Math.abs(diff))}% a mais em receita.`
        )
      }
    }

    for (const [cat, vals] of Object.entries(byCategory)) {
      const prevValue = prevByCategory[cat] || 0
      if (prevValue > 50 && vals.expense > 0) {
        const growth = ((vals.expense - prevValue) / prevValue) * 100
        if (growth > 20) {
          insights.push(
            `Categoria "${cat}" cresceu ${Math.round(growth)}% em relação ao mês anterior.`
          )
        }
      }
    }

    if (prevTotalIncome > 0 && totalIncome > 0) {
      const growth = ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100
      if (growth > 10) {
        insights.push(`Sua renda total cresceu ${Math.round(growth)}% em relação ao mês anterior.`)
      } else if (growth < -10) {
        insights.push(
          `Sua renda caiu ${Math.round(Math.abs(growth))}% em relação ao mês anterior. Vale revisar.`
        )
      }
    }

    if (totalExpense > totalIncome && totalIncome > 0) {
      insights.push(
        `Gastos (${totalExpense.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}) superam a receita no período. Atenção ao fluxo.`
      )
    }

    const alerts: Array<{
      title: string
      description: string
      severity: 'info' | 'warning' | 'critical'
      type: string
    }> = []

    for (const a of accounts || []) {
      if (a.type !== 'credit' && Number(a.balance || 0) < 500) {
        alerts.push({
          title: `Saldo baixo em ${a.name}`,
          description: `A conta está com ${Number(a.balance || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}. Considere um aporte ou evite novos débitos.`,
          severity: Number(a.balance || 0) < 100 ? 'critical' : 'warning',
          type: 'low_balance',
        })
      }
    }

    const monthlyFixedExpense = (fixed || [])
      .filter((f) => f.is_active && f.type === 'expense')
      .reduce((sum, f) => {
        const factor: Record<string, number> = {
          weekly: 4.33,
          biweekly: 2.17,
          monthly: 1,
          bimonthly: 0.5,
          quarterly: 0.33,
          yearly: 1 / 12,
        }
        return sum + Number(f.amount || 0) * (factor[f.frequency] || 1)
      }, 0)

    if (monthlyFixedExpense > totalIncome && totalIncome > 0) {
      alerts.push({
        title: 'Compromissos fixos acima da receita',
        description: `Seus gastos fixos mensais (${monthlyFixedExpense.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}) estão acima da receita do período.`,
        severity: 'critical',
        type: 'overcommit',
      })
    }

    if (totalExpense > totalIncome * 0.9 && totalIncome > 0 && totalExpense < totalIncome) {
      alerts.push({
        title: 'Margem de fluxo apertada',
        description: 'Você já usou mais de 90% da receita em despesas. Controle os últimos dias do mês.',
        severity: 'warning',
        type: 'tight_margin',
      })
    }

    return NextResponse.json({
      period,
      couple: {
        id: couple.id,
        primary: { id: primaryId, email: couple.primary_user_email },
        secondary: secondaryId ? { id: secondaryId, email: couple.secondary_user_email } : null,
      },
      totals: {
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense,
        netWorth: totalNetWorth,
        prevIncome: prevTotalIncome,
        prevExpense: prevTotalExpense,
        monthlyFixedExpense,
      },
      byPerson,
      byCategory,
      byAccountType,
      byAssetType,
      insights,
      alerts,
    })
  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
