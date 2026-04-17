import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, amount, frequency, due_date, category, description, is_active } = body

    const { data: updatedAccount } = await supabase
      .from('fixed_accounts')
      .update({
        name,
        amount,
        frequency,
        due_date,
        category,
        description,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (await params).id)
      .eq('couple_id', coupleData.id)
      .select()
      .single()

    if (!updatedAccount) {
      return NextResponse.json({ error: 'Fixed account not found' }, { status: 404 })
    }

    return NextResponse.json({ fixedAccount: updatedAccount }, { status: 200 })
  } catch (error) {
    console.error('Update fixed account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`primary_user_id.eq.${userData.user.id},secondary_user_id.eq.${userData.user.id}`)
      .single()

    if (!coupleData) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    await supabase
      .from('fixed_accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', (await params).id)
      .eq('couple_id', coupleData.id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete fixed account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
