import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
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

    const { data: contributions } = await supabase
      .from('savings_contributions')
      .select('*')
      .eq('goal_id', params.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ contributions: contributions || [] }, { status: 200 })
  } catch (error) {
    console.error('Get contributions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
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

    const body = await request.json()
    const { amount, description } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Create contribution
    const { data: newContribution } = await supabase
      .from('savings_contributions')
      .insert({
        goal_id: params.id,
        amount,
        description,
        created_by: userData.user.id,
      })
      .select()
      .single()

    // Update goal current_amount
    const { data: goal } = await supabase
      .from('savings_goals')
      .select('current_amount, target_amount')
      .eq('id', params.id)
      .single()

    if (goal) {
      const newAmount = Math.min(goal.current_amount + amount, goal.target_amount)
      await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount })
        .eq('id', params.id)
    }

    return NextResponse.json({ contribution: newContribution }, { status: 201 })
  } catch (error) {
    console.error('Create contribution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
