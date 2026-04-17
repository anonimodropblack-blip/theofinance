import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, partnerEmail } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  try {
    const cookieStore = await cookies()

    // Use SERVICE_ROLE_KEY for admin operations
    const supabase = createServerClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
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
            } catch {
              // Cookies can't be set in route handlers
            }
          },
        },
      }
    )

    // Create user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create couple record
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .insert({
        primary_user_id: authData.user.id,
        primary_user_email: email,
        secondary_user_email: partnerEmail || null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (coupleError) {
      return NextResponse.json(
        { error: 'Failed to create couple record' },
        { status: 500 }
      )
    }

    // If partner email provided, send invite
    if (partnerEmail) {
      // TODO: Send invite email
      // Will be implemented in Wave 3 (invite flow)
    }

    return NextResponse.json(
      {
        success: true,
        coupleId: coupleData.id,
        message: 'Signup successful. Check your email to confirm.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
