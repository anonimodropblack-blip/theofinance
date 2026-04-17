import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
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
    const { title, amount, due_date, status, category, description, reminder_days } = body

    const { data: updatedBill } = await supabase
      .from('due_bills')
      .update({
        title,
        amount,
        due_date,
        status,
        category,
        description,
        reminder_days,
        updated_at: new Date().toISOString(),
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', (await params).id)
      .eq('couple_id', coupleData.id)
      .select()
      .single()

    if (!updatedBill) {
      return NextResponse.json({ error: 'Due bill not found' }, { status: 404 })
    }

    // Calculate days until due
    const dueDate = new Date(updatedBill.due_date)
    const currentDate = new Date()
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const isOverdue = daysUntilDue < 0 && updatedBill.status === 'pending'

    return NextResponse.json(
      { dueBill: { ...updatedBill, daysUntilDue, isOverdue } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update due bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    await supabase
      .from('due_bills')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', (await params).id)
      .eq('couple_id', coupleData.id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete due bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
