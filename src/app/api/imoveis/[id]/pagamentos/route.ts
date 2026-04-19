import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

async function getCoupleId(supabase: any, me: string) {
  const { data } = await supabase
    .from('couples')
    .select('id')
    .or(`primary_user_id.eq.${me},secondary_user_id.eq.${me}`)
    .single()
  return data?.id as string | undefined
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('imovel_pagamentos')
      .select('*')
      .eq('imovel_id', id)
      .order('mes_referencia', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pagamentos: data || [] })
  } catch (error) {
    console.error('GET pagamentos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const body = await req.json()
    const {
      mesReferencia,
      valorBruto,
      valorLiquido,
      dataPagamento,
      status,
      observacoes,
    } = body

    if (!mesReferencia || valorBruto == null || valorLiquido == null) {
      return NextResponse.json(
        { error: 'mesReferencia, valorBruto e valorLiquido são obrigatórios' },
        { status: 400 }
      )
    }

    // upsert por (imovel_id, mes_referencia)
    const { data, error } = await supabase
      .from('imovel_pagamentos')
      .upsert(
        {
          imovel_id: id,
          couple_id: coupleId,
          mes_referencia: mesReferencia,
          valor_bruto: valorBruto,
          valor_liquido: valorLiquido,
          data_pagamento: dataPagamento || null,
          status: status || 'pago',
          observacoes: observacoes || null,
        },
        { onConflict: 'imovel_id,mes_referencia' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pagamento: data }, { status: 201 })
  } catch (error) {
    console.error('POST pagamento error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
