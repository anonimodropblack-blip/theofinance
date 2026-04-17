import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { coupleId, inviteEmail } = body

  if (!coupleId || !inviteEmail) {
    return NextResponse.json(
      { error: 'coupleId and inviteEmail are required' },
      { status: 400 }
    )
  }

  try {
    const cookieStore = await cookies()

    // Get auth user
    const anon = createServerClient(
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

    const { data: userData } = await anon.auth.getUser()

    if (!userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Service role for DB operations
    const admin = createServerClient(
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
            } catch {}
          },
        },
      }
    )

    // Generate token
    const token = crypto.getRandomValues(new Uint8Array(32))
    const tokenString = Array.from(token)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Create invite record
    const { error: inviteError } = await admin
      .from('couple_invites')
      .insert({
        couple_id: coupleId,
        invited_email: inviteEmail,
        token: tokenString,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

    if (inviteError) {
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }

    // TODO: Send email with invite link
    // POST to /api/invites/send-email with token

    return NextResponse.json(
      {
        success: true,
        message: 'Invite sent successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Send invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
