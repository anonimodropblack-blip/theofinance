import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogoutButton } from '@/components/LogoutButton'
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Warehouse,
  Calculator,
  Settings,
  Factory,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
  { href: '/dashboard/fabricantes', label: 'Fabricantes', icon: Factory },
  { href: '/dashboard/lotes', label: 'Lotes', icon: Boxes },
  { href: '/dashboard/precificacao', label: 'Precificação', icon: Calculator },
  { href: '/dashboard/estoque', label: 'Estoque', icon: Warehouse },
  { href: '/dashboard/movimentacoes', label: 'Movimentações', icon: Tags },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <span className="font-semibold tracking-tight">ERP Elysiar</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-end gap-3 px-6">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
