import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
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

    // Calculate date range: last 3 months
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())

    // Get transactions for last 3 months
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('couple_id', coupleData.id)
      .eq('type', 'expense')
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('date', now.toISOString().split('T')[0])

    // Calculate average monthly expense
    let totalExpense = 0
    transactions?.forEach((t) => {
      totalExpense += t.amount
    })

    // Average per month (last 3 months)
    const averageMonthlyExpense = totalExpense / 3

    // Daily average
    const averageDailyExpense = averageMonthlyExpense / 30

    // Generate 30-day forecast
    const dailyForecast = []
    for (let i = 0; i < 30; i++) {
      const forecastDate = new Date(now)
      forecastDate.setDate(forecastDate.getDate() + i)
      dailyForecast.push({
        date: forecastDate.toISOString().split('T')[0],
        expectedExpense: Math.round(averageDailyExpense * 100) / 100,
      })
    }

    const forecast = {
      averageMonthlyExpense: Math.round(averageMonthlyExpense * 100) / 100,
      averageDailyExpense: Math.round(averageDailyExpense * 100) / 100,
      totalForecast30Days: Math.round(averageDailyExpense * 30 * 100) / 100,
      basedOnMonths: 3,
      dailyForecast,
    }

    return NextResponse.json({ forecast }, { status: 200 })
  } catch (error) {
    console.error('Get forecast error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
