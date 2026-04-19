import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

async function getCoupleId(supabase: any, me: string) {
  const { data } = await supabase
    .from('couples')
    .select('id')
    .or(`primary_user_id.eq.${me},secondary_user_id.eq.${me}`)
    .single()
  return data?.id as string | undefined
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('life_goals')
      .select('*')
      .eq('couple_id', coupleId)
      .is('deleted_at', null)
      .order('target_date', { ascending: true, nullsFirst: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ goals: data || [] })
  } catch (error) {
    console.error('GET life-goals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const body = await req.json()
    const {
      category,
      name,
      targetAmount,
      currentAmount,
      targetDate,
      expectedAnnualReturn,
      notes,
    } = body

    if (!category || !name || !targetAmount) {
      return NextResponse.json(
        { error: 'category, name e targetAmount são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('life_goals')
      .insert({
        couple_id: coupleId,
        category,
        name,
        target_amount: targetAmount,
        current_amount: currentAmount ?? 0,
        target_date: targetDate || null,
        expected_annual_return: expectedAnnualReturn ?? 6,
        notes: notes || null,
        created_by: userData.user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ goal: data }, { status: 201 })
  } catch (error) {
    console.error('POST life-goals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
