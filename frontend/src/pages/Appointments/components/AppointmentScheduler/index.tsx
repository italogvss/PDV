import { useMemo } from 'react'
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
 * - O EventCalendar não expõe `onEventClick`/`onSlotClick`; criar/editar passa pelo
 *   dialog interno do componente. Por isso a criação rica acontece no nosso modal
 *   "Novo agendamento" (`eventCreation={false}`) e o detalhe com transições de status
 *   é aberto pelo painel lateral. Mover/redimensionar/excluir na grade reflete em
 *   `onEventsChange`, que a página reconcilia por id.
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
}: AppointmentSchedulerProps) {
  const events = useMemo(() => toSchedulerEvents(appointments), [appointments])
  const resources = useMemo(() => toSchedulerResources(professionals), [professionals])

  return (
    <Box sx={{ height: 660, minHeight: 0 }}>
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
  )
}
