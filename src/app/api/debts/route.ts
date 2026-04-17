import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function createSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await createSupabase()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: coupleData } = await supabase
      .from('couples').select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()
    if (!coupleData) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const { data: debts } = await supabase
      .from('debts').select('*')
      .eq('couple_id', coupleData.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ debts: debts || [] })
  } catch (error) {
    console.error('Get debts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabase()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: coupleData } = await supabase
      .from('couples').select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()
    if (!coupleData) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const body = await request.json()
    const { name, creditor, total_amount, installments_total, installment_value, due_day, notes } = body

    if (!name || !creditor || !total_amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: debt, error } = await supabase
      .from('debts')
      .insert({
        couple_id: coupleData.id,
        name,
        creditor,
        total_amount,
        remaining_amount: total_amount,
        installments_total: installments_total || 1,
        installments_paid: 0,
        installment_value,
        due_day,
        notes,
        status: 'active',
        created_by: userData.user.id,
      })
      .select().single()

    if (error) throw error

    await supabase.from('audit_log').insert({
      couple_id: coupleData.id,
      user_id: userData.user.id,
      action: 'create',
      entity_type: 'debt',
      entity_id: debt.id,
      entity_name: name,
    })

    return NextResponse.json({ debt }, { status: 201 })
  } catch (error) {
    console.error('Create debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
