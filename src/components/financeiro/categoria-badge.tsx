import { KpiIcon, TONES, type Tone } from '@/components/dashboard/KpiIcon'
import { iconeCategoria } from '@/lib/categorias-financeiras'

type Props = {
  icone: string
  cor: string
}

function tone(cor: string): Tone {
  return cor in TONES ? (cor as Tone) : 'neutral'
}

export function CategoriaBadge({ icone, cor }: Props) {
  return <KpiIcon icon={iconeCategoria(icone)} tone={tone(cor)} />
}
