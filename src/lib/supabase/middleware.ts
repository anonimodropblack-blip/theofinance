import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRÍTICO: usar getUser(), NUNCA getSession() em server code
  const { data: { user } } = await supabase.auth.getUser()

  // Rotas protegidas — redirecionar para login se não autenticado
  const PROTECTED_PATHS = ['/dashboard', '/configuracoes', '/convite']
  const isProtected = PROTECTED_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

  // Exceção: /convite/[token] é acessível sem auth para exibir info do convite
  const isInvitePage = request.nextUrl.pathname.startsWith('/convite/')

  if (isProtected && !isInvitePage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
