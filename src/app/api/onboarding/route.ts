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

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: couple } = await supabase
      .from('couples')
      .select('id, display_name, primary_user_email, secondary_user_email, onboarded_at')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const [{ count: accountsCount }, { count: goalsCount }] = await Promise.all([
      supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', couple.id)
        .is('deleted_at', null),
      supabase
        .from('savings_goals')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', couple.id),
    ])

    return NextResponse.json({
      onboarded: !!couple.onboarded_at,
      displayName: couple.display_name,
      primaryEmail: couple.primary_user_email,
      partnerEmail: couple.secondary_user_email,
      accountsCount: accountsCount || 0,
      goalsCount: goalsCount || 0,
    })
  } catch (error) {
    console.error('GET onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { displayName, partnerEmail, complete } = body

    const patch: Record<string, any> = {}
    if (typeof displayName === 'string') patch.display_name = displayName.trim() || null
    if (typeof partnerEmail === 'string') patch.secondary_user_email = partnerEmail.trim() || null
    if (complete === true) patch.onboarded_at = new Date().toISOString()

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase
      .from('couples')
      .update(patch)
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
