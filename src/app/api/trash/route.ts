import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

const TRASH_TABLES = [
  { table: 'transactions', label: 'Transacao' },
  { table: 'accounts', label: 'Conta' },
  { table: 'fixed_accounts', label: 'Conta Fixa' },
  { table: 'savings_goals', label: 'Caixinha' },
  { table: 'due_bills', label: 'Conta a Vencer' },
] as const

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

    const results: Record<string, unknown[]> = {}

    for (const { table, label } of TRASH_TABLES) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('couple_id', coupleData.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      results[table] = (data || []).map(item => ({ ...item, _entity_type: label, _entity_table: table }))
    }

    const allItems = Object.values(results).flat().sort((a: any, b: any) =>
      new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    )

    return NextResponse.json({ items: allItems, count: allItems.length })
  } catch (error) {
    console.error('Get trash error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
