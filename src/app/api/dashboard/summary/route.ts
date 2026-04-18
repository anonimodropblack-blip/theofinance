import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'current_month'

    const supabase = createServerClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get couple
    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    // Calculate date range based on period
    const now = new Date()
    let fromDate = new Date()

    if (period === 'current_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'last_30_days') {
      fromDate.setDate(now.getDate() - 30)
    } else if (period === 'last_3_months') {
      fromDate.setMonth(now.getMonth() - 3)
    }

    // Get transactions for period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('couple_id', coupleData.id)
      .gte('date', fromDate.toISOString().split('T')[0])
      .lte('date', now.toISOString().split('T')[0])

    // Get accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)

    // Get investments (patrimônio aplicado)
    const { data: investments } = await supabase
      .from('investments')
      .select('invested_amount, current_amount')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)

    // Calculate
    let totalIncome = 0
    let totalExpense = 0

    transactions?.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount
      else if (t.type === 'expense') totalExpense += t.amount
    })

    const totalAccountsBalance =
      accounts?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0

    const totalInvested =
      investments?.reduce((sum, i) => sum + Number(i.invested_amount || 0), 0) || 0
    const totalInvestmentsCurrent =
      investments?.reduce((sum, i) => sum + Number(i.current_amount || 0), 0) || 0
    const investmentsProfit = totalInvestmentsCurrent - totalInvested

    const netWorth = totalAccountsBalance + totalInvestmentsCurrent

    const summary = {
      period,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      transactionCount: transactions?.length || 0,
      accountsCount: accounts?.length || 0,
      totalAccountsBalance,
      investmentsCount: investments?.length || 0,
      totalInvested,
      totalInvestmentsCurrent,
      investmentsProfit,
      netWorth,
    }

    return NextResponse.json({ summary }, { status: 200 })
  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
