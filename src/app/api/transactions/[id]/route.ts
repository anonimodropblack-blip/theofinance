import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const {
      amount,
      type,
      categoryId,
      description,
      date,
      accountId,
      toAccountId,
      category,
      subcategory,
      paidByUserId,
      recurringRule,
      recurringUntil,
    } = body

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

    const validRules = new Set([
      'weekly',
      'biweekly',
      'monthly',
      'bimonthly',
      'quarterly',
      'yearly',
    ])

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (amount !== undefined) updates.amount = amount
    if (type) updates.type = type
    if (categoryId !== undefined) updates.category_id = categoryId
    if (description !== undefined) updates.description = description
    if (date) updates.date = date
    if (accountId) updates.account_id = accountId
    if (toAccountId !== undefined) updates.to_account_id = toAccountId
    if (category !== undefined) updates.category = category
    if (subcategory !== undefined) updates.subcategory = subcategory
    if (paidByUserId !== undefined) updates.paid_by_user_id = paidByUserId
    if (recurringRule !== undefined) {
      updates.recurring_rule =
        recurringRule && validRules.has(recurringRule) ? recurringRule : null
    }
    if (recurringUntil !== undefined) updates.recurring_until = recurringUntil

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', (await params).id)
      .select()
      .single()

    if (error || !transaction) {
      return NextResponse.json(
        { error: error?.message || 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ transaction }, { status: 200 })
  } catch (error) {
    console.error('Update transaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', (await params).id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete transaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
