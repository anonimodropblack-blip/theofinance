import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface ScoreComponent {
  key: string
  label: string
  value: number
  max: number
  description: string
}

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
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
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const me = userData.user.id

    const { data: couple } = await supabase
      .from('couples')
      .select('id, primary_user_id, secondary_user_id, primary_user_email, secondary_user_email')
      .or(`primary_user_id.eq.${me},secondary_user_id.eq.${me}`)
      .single()

    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, type, balance, created_by, is_private')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)
      .or(`is_private.eq.false,created_by.eq.${me}`)

    const visibleIds = (accounts || []).map((a) => a.id)

    const { data: transactions } =
      visibleIds.length > 0
        ? await supabase
            .from('transactions')
            .select('amount, type, category, paid_by_user_id, created_by, date')
            .eq('couple_id', couple.id)
            .in('account_id', visibleIds)
            .is('deleted_at', null)
            .gte('date', threeMonthsAgo.toISOString().split('T')[0])
        : { data: [] as Array<{
            amount: number
            type: string
            category: string
            paid_by_user_id: string | null
            created_by: string
            date: string
          }> }

    const { data: investments } = await supabase
      .from('investments')
      .select('invested_amount, current_amount, owner_user_id, created_by, asset_type')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)

    const { data: fixed } = await supabase
      .from('fixed_accounts')
      .select('amount, frequency, type, is_active')
      .eq('couple_id', couple.id)

    const { data: debts } = await supabase
      .from('debts')
      .select('remaining_amount, installment_value, status')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)

    const months = 3
    let incomeSum = 0
    let expenseSum = 0
    for (const t of transactions || []) {
      if (t.type === 'income') incomeSum += Number(t.amount || 0)
      else if (t.type === 'expense') expenseSum += Number(t.amount || 0)
    }
    const avgIncome = incomeSum / months
    const avgExpense = expenseSum / months

    const accountsBalance = (accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0)
    const liquidBalance = (accounts || [])
      .filter((a) => a.type !== 'credit')
      .reduce((s, a) => s + Number(a.balance || 0), 0)

    const investCurrent = (investments || []).reduce((s, i) => s + Number(i.current_amount || 0), 0)
    const investInvested = (investments || []).reduce((s, i) => s + Number(i.invested_amount || 0), 0)
    const netWorth = accountsBalance + investCurrent

    const fixedMonthlyFactor: Record<string, number> = {
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      bimonthly: 0.5,
      quarterly: 0.33,
      yearly: 1 / 12,
    }
    const monthlyFixedExpense = (fixed || [])
      .filter((f) => f.is_active && f.type === 'expense')
      .reduce(
        (s, f) => s + Number(f.amount || 0) * (fixedMonthlyFactor[f.frequency] || 1),
        0
      )
    const monthlyFixedIncome = (fixed || [])
      .filter((f) => f.is_active && f.type === 'income')
      .reduce(
        (s, f) => s + Number(f.amount || 0) * (fixedMonthlyFactor[f.frequency] || 1),
        0
      )

    const debtBalance = (debts || [])
      .filter((d) => d.status === 'active')
      .reduce((s, d) => s + Number(d.remaining_amount || 0), 0)
    const monthlyDebtInstallments = (debts || [])
      .filter((d) => d.status === 'active')
      .reduce((s, d) => s + Number(d.installment_value || 0), 0)

    const components: ScoreComponent[] = []

    // 1. Taxa de poupança (25pts)
    const savingsRate = avgIncome > 0 ? (avgIncome - avgExpense) / avgIncome : 0
    const savingsScore = Math.max(0, Math.min(25, savingsRate * 100))
    components.push({
      key: 'savings_rate',
      label: 'Taxa de poupança',
      value: Math.round(savingsScore),
      max: 25,
      description: `Você está poupando ${Math.round(savingsRate * 100)}% da receita média (ideal: acima de 20%).`,
    })

    // 2. Peso dos compromissos fixos (20pts)
    const fixedRatio = avgIncome > 0 ? monthlyFixedExpense / avgIncome : 1
    const fixedScore = Math.max(0, 20 * (1 - Math.min(1, fixedRatio / 0.6)))
    components.push({
      key: 'fixed_ratio',
      label: 'Compromissos fixos sob controle',
      value: Math.round(fixedScore),
      max: 20,
      description: `Seus gastos fixos representam ${Math.round(fixedRatio * 100)}% da receita (ideal: abaixo de 60%).`,
    })

    // 3. Patrimônio líquido (20pts)
    const netWorthScore = netWorth <= 0 ? 0 : Math.min(20, Math.log10(Math.max(1, netWorth / 1000) + 1) * 6)
    components.push({
      key: 'net_worth',
      label: 'Patrimônio acumulado',
      value: Math.round(netWorthScore),
      max: 20,
      description: `Seu patrimônio líquido é de ${netWorth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    })

    // 4. Endividamento saudável (15pts)
    const debtRatio = avgIncome > 0 ? monthlyDebtInstallments / avgIncome : debtBalance > 0 ? 1 : 0
    const debtScore = Math.max(0, 15 * (1 - Math.min(1, debtRatio / 0.3)))
    components.push({
      key: 'debt_ratio',
      label: 'Endividamento saudável',
      value: Math.round(debtScore),
      max: 15,
      description:
        debtBalance === 0
          ? 'Nenhuma dívida ativa registrada.'
          : `Comprometimento mensal com dívidas: ${Math.round(debtRatio * 100)}% da receita.`,
    })

    // 5. Reserva de emergência (10pts)
    const monthsOfExpensesCovered = avgExpense > 0 ? liquidBalance / avgExpense : 0
    const reserveScore = Math.min(10, (monthsOfExpensesCovered / 6) * 10)
    components.push({
      key: 'emergency_fund',
      label: 'Reserva de emergência',
      value: Math.round(reserveScore),
      max: 10,
      description: `Sua reserva cobre ${monthsOfExpensesCovered.toFixed(1)} meses de despesa média (ideal: 6).`,
    })

    // 6. Investimentos (10pts)
    const investRatio = netWorth > 0 ? investCurrent / netWorth : 0
    const investScore = Math.min(10, investRatio * 30)
    components.push({
      key: 'investments',
      label: 'Diversificação de ativos',
      value: Math.round(investScore),
      max: 10,
      description: `${Math.round(investRatio * 100)}% do patrimônio está investido.`,
    })

    const total = components.reduce((s, c) => s + c.value, 0)

    const rating =
      total >= 80
        ? { label: 'Excelente', color: 'success' }
        : total >= 60
        ? { label: 'Saudável', color: 'primary' }
        : total >= 40
        ? { label: 'Atenção', color: 'gold' }
        : { label: 'Crítico', color: 'danger' }

    const diagnostics: string[] = []
    if (savingsRate < 0) {
      diagnostics.push(
        'Você está gastando mais do que ganha. Priorize cortar gastos variáveis e revisar recorrências desnecessárias.'
      )
    } else if (savingsRate < 0.1) {
      diagnostics.push(
        'Sua taxa de poupança está abaixo de 10%. Meta saudável é guardar pelo menos 20% da renda.'
      )
    }
    if (fixedRatio > 0.7) {
      diagnostics.push(
        'Seus compromissos fixos consomem mais de 70% da receita. Renegocie contratos ou elimine serviços pouco usados.'
      )
    }
    if (monthsOfExpensesCovered < 1) {
      diagnostics.push(
        'Você não tem reserva de emergência. Comece com uma meta de 1 mês de despesa e evolua até 6.'
      )
    } else if (monthsOfExpensesCovered < 3) {
      diagnostics.push(
        `Sua reserva cobre ${monthsOfExpensesCovered.toFixed(1)} meses. Continue aportando até chegar a 6 meses.`
      )
    }
    if (debtRatio > 0.3) {
      diagnostics.push(
        'Seu comprometimento mensal com dívidas passa de 30%. Busque negociar juros ou consolidar contratos.'
      )
    }
    if (investRatio < 0.1 && netWorth > 5000) {
      diagnostics.push(
        'Menos de 10% do patrimônio está investido. Considere começar por renda fixa conservadora.'
      )
    }
    if (diagnostics.length === 0) {
      diagnostics.push('Seu perfil financeiro está equilibrado. Continue no mesmo ritmo.')
    }

    const monthlyNet = avgIncome - avgExpense
    const projection12 = []
    let balance = netWorth
    for (let m = 1; m <= 12; m++) {
      balance = balance + monthlyNet + investCurrent * 0.005
      projection12.push({ month: m, balance: Math.max(0, balance) })
    }

    return NextResponse.json({
      score: Math.round(total),
      rating,
      components,
      diagnostics,
      stats: {
        avgIncome,
        avgExpense,
        monthlyNet,
        monthlyFixedExpense,
        monthlyFixedIncome,
        monthlyDebtInstallments,
        netWorth,
        liquidBalance,
        investCurrent,
        investInvested,
        monthsOfExpensesCovered,
        debtBalance,
      },
      projection12,
      couple: {
        primary: { id: couple.primary_user_id, email: couple.primary_user_email },
        secondary: couple.secondary_user_id
          ? { id: couple.secondary_user_id, email: couple.secondary_user_email }
          : null,
      },
    })
  } catch (error) {
    console.error('Score error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
