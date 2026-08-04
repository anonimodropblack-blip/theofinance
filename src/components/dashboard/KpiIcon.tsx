import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const TONES = {
  blue: 'bg-primary/15 text-primary',
  green: 'bg-success/15 text-success',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-destructive/15 text-destructive',
  violet: 'bg-chart-5/15 text-chart-5',
  neutral: 'bg-muted text-muted-foreground',
} as const

export type Tone = keyof typeof TONES

// Cor sólida por tom, pra seletor de cor (bolinha) — TONES acima é sempre fundo translúcido (15%),
// bom demais pra badge, fraco demais pra servir de swatch visível.
export const TONE_SWATCH: Record<Tone, string> = {
  blue: 'bg-primary',
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-destructive',
  violet: 'bg-chart-5',
  neutral: 'bg-muted-foreground',
}

export function KpiIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}
