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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { name, creditor, total_amount, remaining_amount, installments_total, installments_paid, installment_value, due_day, status, notes } = body

    const { data: debt, error } = await supabase
      .from('debts')
      .update({
        name, creditor, total_amount, remaining_amount,
        installments_total, installments_paid, installment_value,
        due_day, status, notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (await params).id)
      .eq('couple_id', coupleData.id)
      .select().single()

    if (error || !debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 })

    await supabase.from('audit_log').insert({
      couple_id: coupleData.id,
      user_id: userData.user.id,
      action: 'update',
      entity_type: 'debt',
      entity_id: (await params).id,
      entity_name: debt.name,
      metadata: { status: body.status },
    })

    return NextResponse.json({ debt })
  } catch (error) {
    console.error('Update debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabase()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: coupleData } = await supabase
      .from('couples').select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()
    if (!coupleData) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const { data: debt } = await supabase
      .from('debts').select('name').eq('id', (await params).id).eq('couple_id', coupleData.id).single()

    await supabase.from('debts').delete().eq('id', (await params).id).eq('couple_id', coupleData.id)

    if (debt) {
      await supabase.from('audit_log').insert({
        couple_id: coupleData.id,
        user_id: userData.user.id,
        action: 'delete',
        entity_type: 'debt',
        entity_id: (await params).id,
        entity_name: debt.name,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
