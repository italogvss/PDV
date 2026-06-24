import { useMemo } from 'react'
import type React from 'react'
import { Box } from '@mui/material'
import { EventCalendar, eventCalendarClasses } from '@mui/x-scheduler/event-calendar'
import { ptBR } from '@mui/x-scheduler/locales'
import dayjs from 'dayjs'
import { toSchedulerEvents, toSchedulerResources } from '../appointmentHelpers'
import type { AppointmentSchedulerProps } from './types'

const localeText = ptBR.components.MuiEventCalendar.defaultProps.localeText

/**
 * Wrapper do MUI X Scheduler (EventCalendar) controlado pelo estado da página.
 *
 * Observações da integração (beta 9.0.0):
 * - O EventCalendar não expõe `onEventClick`/`onSlotClick`. Usamos `onClickCapture`
 *   no wrapper + `className: appt-{id}` em cada evento para interceptar cliques antes
 *   que o MUI X abra seu dialog nativo, abrindo nosso `AppointmentDetailModal`.
 *   Mover/redimensionar/excluir na grade reflete em `onEventsChange`, que a página
 *   reconcilia por id (esses gestos usam mousedown, não click, sem conflito).
 * - A toolbar e o painel lateral nativos são ocultados — usamos o nosso cabeçalho,
 *   DatePicker, faixa da semana e painel lateral.
 */
export default function AppointmentScheduler({
  appointments,
  professionals,
  view,
  visibleDate,
  visibleResources,
  onViewChange,
  onVisibleDateChange,
  onEventsChange,
  onEventClick,
}: AppointmentSchedulerProps) {
  const events = useMemo(() => toSchedulerEvents(appointments), [appointments])
  const resources = useMemo(() => toSchedulerResources(professionals), [professionals])

  // Injeta cor hex customizada via CSS scoped ao wrapper, pois o MUI X Scheduler
  // só aceita SchedulerEventColor (nomes fixos) — o hex não pode ir pelo model.
  const customColorSx = useMemo(() => {
    const styles: Record<string, object> = {}
    for (const a of appointments) {
      if (a.color) {
        styles[`& .appt-${a.id}`] = {
          backgroundColor: `${a.color} !important`,
          borderColor: `${a.color} !important`,
        }
      }
    }
    return styles
  }, [appointments])

  const handleClickCapture = (e: React.MouseEvent) => {
    let node: HTMLElement | null = e.target as HTMLElement
    while (node && node !== e.currentTarget) {
      const apptClass = Array.from(node.classList).find((c) => c.startsWith('appt-'))
      if (apptClass) {
        e.stopPropagation()
        onEventClick(apptClass.slice('appt-'.length))
        return
      }
      node = node.parentElement
    }
  }

  return (
    <Box onClickCapture={handleClickCapture} sx={customColorSx}>
    <Box sx={{ height: 660, minHeight: 0, border: "none"}}>
      <EventCalendar
        events={events}
        resources={resources}
        view={view}
        views={['day', 'week']}
        onViewChange={(next) => {
          if (next === 'day' || next === 'week') onViewChange(next)
        }}
        visibleDate={visibleDate}
        onVisibleDateChange={(next) => onVisibleDateChange(dayjs(next).toDate())}
        visibleResources={visibleResources}
        eventCreation={false}
        onEventsChange={onEventsChange}
        localeText={localeText}
        defaultPreferences={{ isSidePanelOpen: false, ampm: false }}
        sx={{
          height: '100%',
          border: '1px solid',
          borderColor: 'border.subtle',
          borderRadius: 2,
          overflow: 'hidden',
          [`& .${eventCalendarClasses.headerToolbar}`]: { display: 'none' },
          [`& .${eventCalendarClasses.sidePanel}`]: { display: 'none' },
        }}
      />
    </Box>
    </Box>
  )
}
