import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { DueBill } from '@/types'

export async function GET(request: NextRequest) {
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

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const { data: bills } = await supabase
      .from('due_bills')
      .select('*')
      .eq('couple_id', coupleData.id)
      .order('due_date', { ascending: true })

    // Calculate days until due and isOverdue
    const today = new Date().toISOString().split('T')[0]
    const billsWithCalculations = bills?.map((bill) => {
      const dueDate = new Date(bill.due_date)
      const currentDate = new Date(today)
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isOverdue = daysUntilDue < 0 && bill.status === 'pending'

      return {
        ...bill,
        daysUntilDue,
        isOverdue,
      }
    }) || []

    return NextResponse.json({ dueBills: billsWithCalculations }, { status: 200 })
  } catch (error) {
    console.error('Get due bills error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, amount, due_date, category, description, reminder_days = 0 } = body

    if (!title || !amount || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: newBill } = await supabase
      .from('due_bills')
      .insert({
        couple_id: coupleData.id,
        title,
        amount,
        due_date,
        category,
        description,
        reminder_days,
        status: 'pending',
        created_by: userData.user.id,
      })
      .select()
      .single()

    // Calculate days until due
    const dueDate = new Date(newBill.due_date)
    const currentDate = new Date()
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json(
      { dueBill: { ...newBill, daysUntilDue, isOverdue: false } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create due bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
