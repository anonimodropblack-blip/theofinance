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

    const { data: savingsGoals } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('couple_id', coupleData.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Calculate progress for each goal
    const goalsWithProgress = savingsGoals?.map((goal) => ({
      ...goal,
      progress: (goal.current_amount / goal.target_amount) * 100,
    })) || []

    return NextResponse.json({ savingsGoals: goalsWithProgress }, { status: 200 })
  } catch (error) {
    console.error('Get savings goals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { name, target_amount, current_amount = 0, icon = '🎯', color = '#ec4899', deadline } = body

    if (!name || !target_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: newGoal } = await supabase
      .from('savings_goals')
      .insert({
        couple_id: coupleData.id,
        name,
        target_amount,
        current_amount,
        icon,
        color,
        deadline,
        created_by: userData.user.id,
      })
      .select()
      .single()

    const progress = (newGoal.current_amount / newGoal.target_amount) * 100

    return NextResponse.json(
      { savingsGoal: { ...newGoal, progress } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create savings goal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
