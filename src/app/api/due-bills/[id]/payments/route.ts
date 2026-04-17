import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
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

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: payments } = await supabase
      .from('bill_payments')
      .select('*')
      .eq('bill_id', params.id)
      .order('paid_date', { ascending: false })

    return NextResponse.json({ payments: payments || [] }, { status: 200 })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
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

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount_paid, paid_date = new Date().toISOString().split('T')[0], payment_method, notes } = body

    if (!amount_paid) {
      return NextResponse.json({ error: 'Amount required' }, { status: 400 })
    }

    // Get bill to check total
    const { data: bill } = await supabase
      .from('due_bills')
      .select('amount, status')
      .eq('id', params.id)
      .single()

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    // Create payment
    const { data: payment } = await supabase
      .from('bill_payments')
      .insert({
        bill_id: params.id,
        amount_paid,
        paid_date,
        payment_method,
        notes,
        created_by: userData.user.id,
      })
      .select()
      .single()

    // Check if fully paid
    const { data: payments } = await supabase
      .from('bill_payments')
      .select('amount_paid')
      .eq('bill_id', params.id)

    const totalPaid = payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0

    // If fully paid, update bill status
    if (totalPaid >= bill.amount && bill.status === 'pending') {
      await supabase
        .from('due_bills')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', params.id)
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
