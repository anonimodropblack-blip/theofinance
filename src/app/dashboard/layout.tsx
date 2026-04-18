'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  TrendingUp,
  CalendarDays,
  BarChart3,
  MessageCircle,
  CircleDollarSign,
  Trash2,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutDashboard
  group: 'principal' | 'financas' | 'planejamento' | 'sistema'
}

const NAV: NavItem[] = [
  { name: 'Visão geral', href: '/dashboard', icon: LayoutDashboard, group: 'principal' },
  { name: 'Contas', href: '/dashboard/contas', icon: Wallet, group: 'financas' },
  { name: 'Transações', href: '/dashboard/transacoes', icon: ArrowLeftRight, group: 'financas' },
  { name: 'Contas fixas', href: '/dashboard/contas-fixas', icon: CircleDollarSign, group: 'financas' },
  { name: 'Dívidas', href: '/dashboard/dividas', icon: CircleDollarSign, group: 'financas' },
  { name: 'Investimentos', href: '/dashboard/investimentos', icon: TrendingUp, group: 'financas' },
  { name: 'Metas', href: '/dashboard/objetivos', icon: Target, group: 'planejamento' },
  { name: 'Calendário', href: '/dashboard/calendario', icon: CalendarDays, group: 'planejamento' },
  { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3, group: 'planejamento' },
  { name: 'Insights', href: '/dashboard/insights', icon: TrendingUp, group: 'planejamento' },
  { name: 'Chat IA', href: '/dashboard/chat', icon: MessageCircle, group: 'sistema' },
  { name: 'Lixeira', href: '/dashboard/lixeira', icon: Trash2, group: 'sistema' },
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, group: 'sistema' },
]

const GROUP_LABEL: Record<NavItem['group'], string> = {
  principal: 'Principal',
  financas: 'Finanças',
  planejamento: 'Planejamento',
  sistema: 'Sistema',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth/login')
      } else {
        setUser(data.user)
        setLoading(false)
      }
    })
  }, [router])

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        <div className="inline-flex items-center gap-3 text-sm">
          <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
          Carregando…
        </div>
      </div>
    )
  }

  if (!user) return null

  const groups: NavItem['group'][] = ['principal', 'financas', 'planejamento', 'sistema']

  const sidebar = (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col">
      <div className="px-6 py-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--success)] flex items-center justify-center">
            <CircleDollarSign className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
            Theo<span className="text-[var(--primary)]">Finance</span>
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => {
          const items = NAV.filter((n) => n.group === group)
          if (!items.length) return null
          return (
            <div key={group}>
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                {GROUP_LABEL[group]}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-[var(--primary-subtle)] text-[var(--primary)] font-medium'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center font-semibold">
            {user.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--text)] truncate">{user.email}</div>
            <div className="text-xs text-[var(--text-subtle)]">Perfil individual</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] py-2 text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur px-4 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)]"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="text-sm text-[var(--text-subtle)]">
              Bem-vindo de volta
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>

      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
          className="fixed top-3 right-3 z-[60] lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--text)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
