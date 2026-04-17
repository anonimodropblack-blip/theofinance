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

const VALID_TABLES = ['transactions', 'accounts', 'fixed_accounts', 'savings_goals', 'due_bills']

export async function DELETE(request: NextRequest) {
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
    const { entity_table, entity_id } = body

    if (!entity_table || !entity_id) {
      return NextResponse.json({ error: 'Missing entity_table or entity_id' }, { status: 400 })
    }

    if (!VALID_TABLES.includes(entity_table)) {
      return NextResponse.json({ error: 'Invalid entity_table' }, { status: 400 })
    }

    await supabase
      .from(entity_table)
      .delete()
      .eq('id', entity_id)
      .eq('couple_id', coupleData.id)
      .not('deleted_at', 'is', null)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Purge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
