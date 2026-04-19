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

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('imoveis')
      .select('*')
      .eq('couple_id', coupleId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imoveis: data || [] })
  } catch (error) {
    console.error('GET imoveis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleId = await getCoupleId(supabase, userData.user.id)
    if (!coupleId) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const body = await req.json()
    const {
      apelido,
      tipo,
      endereco,
      valorImovel,
      valorAluguel,
      diaVencimento,
      taxaAdminPct,
      inquilinoNome,
      inquilinoTelefone,
      inquilinoObservacoes,
      contratoInicio,
      contratoFim,
      dataReajuste,
      status,
    } = body

    if (!apelido || !tipo || valorAluguel == null) {
      return NextResponse.json(
        { error: 'apelido, tipo e valorAluguel são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('imoveis')
      .insert({
        couple_id: coupleId,
        apelido,
        tipo,
        endereco: endereco || null,
        valor_imovel: valorImovel ?? null,
        valor_aluguel: valorAluguel,
        dia_vencimento: diaVencimento ?? null,
        taxa_admin_pct: taxaAdminPct ?? 0,
        inquilino_nome: inquilinoNome || null,
        inquilino_telefone: inquilinoTelefone || null,
        inquilino_observacoes: inquilinoObservacoes || null,
        contrato_inicio: contratoInicio || null,
        contrato_fim: contratoFim || null,
        data_reajuste: dataReajuste || null,
        status: status || 'alugado',
        created_by: userData.user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imovel: data }, { status: 201 })
  } catch (error) {
    console.error('POST imoveis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
