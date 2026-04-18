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

async function getCoupleId(supabase: Awaited<ReturnType<typeof createSupabase>>, userId: string) {
  const { data } = await supabase
    .from('couples').select('id')
    .or(`primary_user_id.eq.${userId},secondary_user_id.eq.${userId}`)
    .single()
  return data?.id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabase()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const body = await request.json()
    const { name, ticker, asset_type, invested_amount, current_amount, source, notes, owner_user_id } = body

    if (asset_type && !VALID_TYPES.includes(asset_type)) {
      return NextResponse.json({ error: 'Invalid asset_type' }, { status: 400 })
    }

    const { id } = await params
    const patch: Record<string, unknown> = { last_updated_at: new Date().toISOString() }
    if (name !== undefined) patch.name = name
    if (ticker !== undefined) patch.ticker = ticker || null
    if (asset_type !== undefined) patch.asset_type = asset_type
    if (invested_amount !== undefined) patch.invested_amount = invested_amount
    if (current_amount !== undefined) patch.current_amount = current_amount
    if (source !== undefined) patch.source = source || null
    if (notes !== undefined) patch.notes = notes || null
    if (owner_user_id !== undefined) patch.owner_user_id = owner_user_id

    const { data: investment, error } = await supabase
      .from('investments')
      .update(patch)
      .eq('id', id)
      .eq('couple_id', coupleId)
      .is('deleted_at', null)
      .select().single()

    if (error || !investment)
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })

    await supabase.from('audit_log').insert({
      couple_id: coupleId,
      user_id: userData.user.id,
      action: 'update',
      entity_type: 'investment',
      entity_id: id,
      entity_name: investment.name,
    })

    return NextResponse.json({ investment })
  } catch (error) {
    console.error('Update investment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabase()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const { id } = await params

    const { data: investment } = await supabase
      .from('investments')
      .select('name')
      .eq('id', id)
      .eq('couple_id', coupleId)
      .single()

    const { error } = await supabase
      .from('investments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('couple_id', coupleId)

    if (error) throw error

    if (investment) {
      await supabase.from('audit_log').insert({
        couple_id: coupleId,
        user_id: userData.user.id,
        action: 'delete',
        entity_type: 'investment',
        entity_id: id,
        entity_name: investment.name,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete investment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
