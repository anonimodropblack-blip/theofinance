import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const VALID_TYPES = ['renda_fixa', 'renda_variavel', 'cripto', 'outros'] as const

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

    const { data: investments } = await supabase
      .from('investments').select('*')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)
      .order('asset_type', { ascending: true })
      .order('created_at', { ascending: false })

    return NextResponse.json({ investments: investments || [] })
  } catch (error) {
    console.error('Get investments error:', error)
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
    const {
      name, ticker, asset_type, invested_amount, current_amount,
      source, notes, owner_user_id,
    } = body

    if (!name || !asset_type || invested_amount == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!VALID_TYPES.includes(asset_type)) {
      return NextResponse.json({ error: 'Invalid asset_type' }, { status: 400 })
    }

    const { data: investment, error } = await supabase
      .from('investments')
      .insert({
        couple_id: coupleData.id,
        owner_user_id: owner_user_id ?? userData.user.id,
        name,
        ticker: ticker || null,
        asset_type,
        invested_amount,
        current_amount: current_amount ?? invested_amount,
        source: source || null,
        notes: notes || null,
        created_by: userData.user.id,
      })
      .select().single()

    if (error) throw error

    await supabase.from('audit_log').insert({
      couple_id: coupleData.id,
      user_id: userData.user.id,
      action: 'create',
      entity_type: 'investment',
      entity_id: investment.id,
      entity_name: name,
    })

    return NextResponse.json({ investment }, { status: 201 })
  } catch (error) {
    console.error('Create investment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
