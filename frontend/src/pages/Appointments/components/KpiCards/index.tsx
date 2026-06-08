import { Box, Card, CardContent, Typography } from '@mui/material'
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import PaidOutlined from '@mui/icons-material/PaidOutlined'
import DonutLargeOutlined from '@mui/icons-material/DonutLargeOutlined'
import { formatBRL } from '../../../../utils/currency'
import type { KpiCardsProps } from './types'

interface CardSpec {
  icon: typeof EventNoteOutlined
  label: string
  value: string
  delta: string
  tone: 'success' | 'warning' | 'neutral'
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  const hours = (min: number) => (min / 60).toFixed(min % 60 === 0 ? 0 : 1)

  const cards: CardSpec[] = [
    {
      icon: EventNoteOutlined,
      label: 'Agendamentos',
      value: String(kpis.count),
      delta: `${kpis.pendentes} a confirmar`,
      tone: kpis.pendentes > 0 ? 'warning' : 'success',
    },
    {
      icon: CheckCircleOutlineRounded,
      label: 'Confirmados',
      value: String(kpis.confirmados),
      delta: `${kpis.confirmedPct}% da agenda`,
      tone: 'success',
    },
    {
      icon: PaidOutlined,
      label: 'Receita prevista',
      value: formatBRL(kpis.revenue),
      delta: 'serviços do dia',
      tone: 'neutral',
    },
    {
      icon: DonutLargeOutlined,
      label: 'Taxa de ocupação',
      value: `${kpis.occupancy}%`,
      delta: `${hours(kpis.bookedMin)}h de ${hours(kpis.availMin)}h`,
      tone: kpis.occupancy > 70 ? 'success' : 'warning',
    },
  ]

  const toneColor = (tone: CardSpec['tone']) =>
    tone === 'success' ? 'success.main' : tone === 'warning' ? 'warning.main' : 'text.tertiary'

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Icon sx={{ fontSize: 15, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
              </Box>
              <Typography variant="h1" sx={{ lineHeight: 1, mb: 0.75 }}>
                {card.value}
              </Typography>
              <Typography variant="caption" sx={{ color: toneColor(card.tone), fontWeight: 500 }}>
                {card.delta}
              </Typography>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )
}
