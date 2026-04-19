import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('accountId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

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

    // Resolve IDs de contas visíveis (exclui privadas alheias)
    const { data: visibleAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)
      .or(`is_private.eq.false,created_by.eq.${userData.user.id}`)

    const visibleIds = (visibleAccounts || []).map((a) => a.id)

    if (visibleIds.length === 0) {
      return NextResponse.json({ transactions: [] }, { status: 200 })
    }

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)
      .in('account_id', visibleIds)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (fromDate) {
      query = query.gte('date', fromDate)
    }

    if (toDate) {
      query = query.lte('date', toDate)
    }

    const { data: transactions, error } = await query.order('date', {
      ascending: false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transactions }, { status: 200 })
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      accountId,
      amount,
      type,
      categoryId,
      description,
      date,
      subcategory,
      paidByUserId,
      toAccountId,
      recurringRule,
      recurringUntil,
      category,
    } = body

    if (!accountId || !amount || !type) {
      return NextResponse.json(
        { error: 'accountId, amount, and type are required' },
        { status: 400 }
      )
    }

    if (type === 'transfer' && !toAccountId) {
      return NextResponse.json(
        { error: 'toAccountId é obrigatório para transferências' },
        { status: 400 }
      )
    }

    if (toAccountId && toAccountId === accountId) {
      return NextResponse.json(
        { error: 'Conta de origem e destino devem ser diferentes' },
        { status: 400 }
      )
    }

    const validRules = new Set([
      'weekly',
      'biweekly',
      'monthly',
      'bimonthly',
      'quarterly',
      'yearly',
    ])
    const normalizedRule =
      recurringRule && validRules.has(recurringRule) ? recurringRule : null

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

    // Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        couple_id: coupleData.id,
        account_id: accountId,
        to_account_id: toAccountId || null,
        amount,
        type,
        category: category || null,
        subcategory: subcategory || null,
        category_id: categoryId || null,
        description: description || null,
        date: date || new Date().toISOString().split('T')[0],
        paid_by_user_id: paidByUserId || userData.user.id,
        recurring_rule: normalizedRule,
        recurring_until: recurringUntil || null,
        created_by: userData.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Create transaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
