import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(
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

    const body = await request.json()
    const { content } = body

    // Store user message
    await supabase.from('conversation_messages').insert({
      conversation_id: (await params).id,
      role: 'user',
      content,
    })

    // Get conversation history
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', (await params).id)
      .order('created_at', { ascending: true })

    // Build prompt with context
    const systemPrompt = `Você é um assistente financeiro inteligente. Ajude o usuário com análise de gastos, dicas de economia, planejamento de orçamento e investimentos. Seja conciso e prático. Respostas em português do Brasil.`

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 500,
      system: systemPrompt,
      messages:
        messages?.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })) || [],
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''

    // Store assistant message
    const { data: storedMessage } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: (await params).id,
        role: 'assistant',
        content: assistantMessage,
        tokens_used: response.usage.output_tokens,
      })
      .select()
      .single()

    return NextResponse.json({ message: storedMessage }, { status: 201 })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
