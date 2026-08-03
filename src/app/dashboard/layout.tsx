import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex">
      <Sidebar items={NAV} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
