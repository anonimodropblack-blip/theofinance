import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  blue: 'bg-primary/15 text-primary',
  green: 'bg-success/15 text-success',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-destructive/15 text-destructive',
  violet: 'bg-chart-5/15 text-chart-5',
} as const

export function KpiIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: keyof typeof TONES }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}
