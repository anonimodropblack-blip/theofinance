import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'income' or 'expense'

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

    const { data: existing, error: existingErr } = await supabase
      .from('transaction_categories')
      .select('id')
      .eq('couple_id', coupleData.id)
      .limit(1)

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 })
    }

    // Backfill: se casal não tem nenhuma categoria ainda, cria o seed padrão
    if (!existing || existing.length === 0) {
      const DEFAULT_CATEGORIES: Array<{
        name: string
        type: 'income' | 'expense'
        color: string
      }> = [
        { name: 'Salário', type: 'income', color: '#10b981' },
        { name: 'Freelance', type: 'income', color: '#34d399' },
        { name: 'Rendimento', type: 'income', color: '#6ee7b7' },
        { name: 'Bônus', type: 'income', color: '#a7f3d0' },
        { name: 'Outros', type: 'income', color: '#9ca3af' },
        { name: 'Alimentação', type: 'expense', color: '#ef4444' },
        { name: 'Moradia', type: 'expense', color: '#f97316' },
        { name: 'Transporte', type: 'expense', color: '#facc15' },
        { name: 'Saúde', type: 'expense', color: '#ec4899' },
        { name: 'Lazer', type: 'expense', color: '#8b5cf6' },
        { name: 'Educação', type: 'expense', color: '#3b82f6' },
        { name: 'Serviços', type: 'expense', color: '#06b6d4' },
        { name: 'Compras', type: 'expense', color: '#d946ef' },
        { name: 'Assinaturas', type: 'expense', color: '#f59e0b' },
        { name: 'Outros', type: 'expense', color: '#6b7280' },
      ]

      await supabase.from('transaction_categories').insert(
        DEFAULT_CATEGORIES.map((c) => ({
          couple_id: coupleData.id,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: null,
        })),
      )
    }

    let query = supabase
      .from('transaction_categories')
      .select('*')
      .eq('couple_id', coupleData.id)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: categories, error } = await query.order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories }, { status: 200 })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, color, icon } = body

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

    // Create category
    const { data: category, error } = await supabase
      .from('transaction_categories')
      .insert({
        couple_id: coupleData.id,
        name,
        type,
        color: color || '#6b7280',
        icon: icon || '📌',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
