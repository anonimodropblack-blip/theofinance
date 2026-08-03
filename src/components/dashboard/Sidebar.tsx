'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
import { CommandPalette } from '@/components/CommandPalette'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Warehouse,
  Calculator,
  Settings,
  Factory,
  Wallet,
  History,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
  { href: '/dashboard/fabricantes', label: 'Fabricantes', icon: Factory },
  { href: '/dashboard/lotes', label: 'Lotes', icon: Boxes },
  { href: '/dashboard/precificacao', label: 'Precificação', icon: Calculator },
  { href: '/dashboard/estoque', label: 'Estoque', icon: Warehouse },
  { href: '/dashboard/movimentacoes', label: 'Movimentações', icon: Tags },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/dashboard/historico', label: 'Histórico', icon: History },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center px-4">
        <span className="text-sm font-semibold tracking-tight">ERP Elysiar</span>
      </div>
      <div className="px-3 pb-3">
        <CommandPalette items={NAV} />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3">
        <LogoutButton />
      </div>
    </aside>
  )
}
