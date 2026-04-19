import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get couple
    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    // Get accounts (oculta contas privadas do parceiro)
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)
      .or(`is_private.eq.false,created_by.eq.${userData.user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ accounts }, { status: 200 })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, color, is_private } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

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

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get couple
    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    // Create account
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        couple_id: coupleData.id,
        name,
        type,
        color: color || '#3b82f6',
        is_private: !!is_private,
        created_by: userData.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Create account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
