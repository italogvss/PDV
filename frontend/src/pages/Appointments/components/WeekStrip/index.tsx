import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { appointmentsOfDay } from '../appointmentHelpers'
import type { WeekStripProps } from './types'

const DOW_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function WeekStrip({ selectedDate, appointments, onSelectDay }: WeekStripProps) {
  // Segunda-feira da semana que contém o dia selecionado.
  const monday = selectedDate.subtract((selectedDate.day() + 6) % 7, 'day')
  const days = Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'))
  const today = dayjs()

  return (
    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
      {days.map((day, i) => {
        const count = appointmentsOfDay(appointments, day).filter(
          (a) => a.status !== 'cancelado',
        ).length
        const isSelected = day.isSame(selectedDate, 'day')
        const isToday = day.isSame(today, 'day')

        return (
          <Box
            key={day.toISOString()}
            role="button"
            tabIndex={0}
            onClick={() => onSelectDay(day)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectDay(day)
            }}
            sx={{
              flex: '1 0 auto',
              minWidth: 76,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              cursor: 'pointer',
              border: '1px solid',
              textAlign: 'center',
              transition: 'background-color .15s, border-color .15s',
              bgcolor: isSelected ? 'text.primary' : 'background.paper',
              borderColor: isSelected
                ? 'text.primary'
                : isToday
                  ? 'success.main'
                  : 'border.subtle',
              color: isSelected ? 'background.paper' : 'text.primary',
              '&:hover': { borderColor: isSelected ? 'text.primary' : 'border.strong' },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 500,
                color: isSelected ? 'rgba(255,255,255,0.7)' : 'text.tertiary',
              }}
            >
              {DOW_SHORT[i]}
            </Typography>
            <Typography variant="h3" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
              {day.date()}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mt: 0.25,
                minHeight: 14,
              }}
            >
              {count > 0 ? (
                <>
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: isSelected ? 'background.paper' : 'success.main',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: isSelected ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}
                  >
                    {count}
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="caption"
                  sx={{ color: isSelected ? 'rgba(255,255,255,0.5)' : 'text.disabled' }}
                >
                  —
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
