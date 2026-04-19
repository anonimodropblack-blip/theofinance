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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const patch: Record<string, any> = {}
    const map: Record<string, string> = {
      apelido: 'apelido',
      tipo: 'tipo',
      endereco: 'endereco',
      valorImovel: 'valor_imovel',
      valorAluguel: 'valor_aluguel',
      diaVencimento: 'dia_vencimento',
      taxaAdminPct: 'taxa_admin_pct',
      inquilinoNome: 'inquilino_nome',
      inquilinoTelefone: 'inquilino_telefone',
      inquilinoObservacoes: 'inquilino_observacoes',
      contratoInicio: 'contrato_inicio',
      contratoFim: 'contrato_fim',
      dataReajuste: 'data_reajuste',
      status: 'status',
    }
    for (const [k, col] of Object.entries(map)) {
      if (k in body) patch[col] = body[k]
    }

    const { data, error } = await supabase
      .from('imoveis')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imovel: data })
  } catch (error) {
    console.error('PATCH imovel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await getClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('imoveis')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE imovel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
