import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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

    await supabase.from('conversation_messages').insert({
      conversation_id: (await params).id,
      role: 'user',
      content,
    })

    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', (await params).id)
      .order('created_at', { ascending: true })

    const systemPrompt = `Você é um assistente financeiro inteligente. Ajude o usuário com análise de gastos, dicas de economia, planejamento de orçamento e investimentos. Seja conciso e prático. Respostas em português do Brasil.`

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: 500 },
    })

    const history = (messages || []).slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(content)
    const assistantMessage = result.response.text()
    const tokensUsed = result.response.usageMetadata?.candidatesTokenCount ?? 0

    const { data: storedMessage } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: (await params).id,
        role: 'assistant',
        content: assistantMessage,
        tokens_used: tokensUsed,
      })
      .select()
      .single()

    return NextResponse.json({ message: storedMessage }, { status: 201 })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
