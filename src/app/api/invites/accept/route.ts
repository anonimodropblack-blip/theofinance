import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, userId } = body

  if (!token || !userId) {
    return NextResponse.json(
      { error: 'token and userId are required' },
      { status: 400 }
    )
  }

  try {
    const cookieStore = await cookies()

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

    // Find invite by token
    const { data: inviteData, error: findError } = await admin
      .from('couple_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (findError || !inviteData) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(inviteData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (inviteData.accepted_at) {
      return NextResponse.json(
        { error: 'Invite already accepted' },
        { status: 400 }
      )
    }

    // Update couple with secondary user
    const { error: updateError } = await admin
      .from('couples')
      .update({
        secondary_user_id: userId,
        secondary_user_email: inviteData.invited_email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteData.couple_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to accept invite' },
        { status: 500 }
      )
    }

    // Mark invite as accepted
    const { error: acceptError } = await admin
      .from('couple_invites')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inviteData.id)

    if (acceptError) {
      console.error('Failed to mark invite as accepted:', acceptError)
      // Don't fail, the couple update succeeded
    }

    return NextResponse.json(
      {
        success: true,
        coupleId: inviteData.couple_id,
        message: 'Invite accepted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
