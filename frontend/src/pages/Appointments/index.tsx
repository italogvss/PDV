import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import TodayOutlined from '@mui/icons-material/TodayOutlined'
import { DatePicker } from '@mui/x-date-pickers'
import type { SchedulerEvent } from '@mui/x-scheduler/models'
import dayjs from 'dayjs'
import { useToast } from '../../hooks/useToast'
import type { AppointmentStatus } from '../../types/appointment.types'
import { MOCK_CUSTOMERS, MOCK_PROFESSIONALS, MOCK_SERVICES, SEED_APPOINTMENTS } from './mock'
import { computeKpis, proColorKey, type ProColorKey } from './components/appointmentHelpers'
import KpiCards from './components/KpiCards'
import WeekStrip from './components/WeekStrip'
import SidePanel from './components/SidePanel'
import AppointmentScheduler from './components/AppointmentScheduler'
import NewAppointmentModal from './components/NewAppointmentModal'
import AppointmentDetailModal from './components/AppointmentDetailModal'
import type { Appointment } from '../../types/appointment.types'
import type { AgendaView, NewAppointmentPrefill } from './types'

const DOW_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

const STATUS_TOAST: Record<AppointmentStatus, string> = {
  pendente: 'Agendamento marcado como pendente.',
  confirmado: 'Agendamento confirmado!',
  em_atendimento: 'Atendimento iniciado.',
  concluido: 'Atendimento concluído!',
  cancelado: 'Agendamento cancelado.',
}

export default function AppointmentsPage() {
  const theme = useTheme()
  const showToast = useToast()

  const professionals = MOCK_PROFESSIONALS
  const services = MOCK_SERVICES
  const customers = MOCK_CUSTOMERS

  const [appointments, setAppointments] = useState<Appointment[]>(SEED_APPOINTMENTS)
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [view, setView] = useState<AgendaView>('day')
  const [proFilter, setProFilter] = useState<string>('todos')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [prefill, setPrefill] = useState<NewAppointmentPrefill | null>(null)

  const isToday = selectedDate.isSame(dayjs(), 'day')
  const kpis = useMemo(
    () => computeKpis(appointments, professionals, selectedDate),
    [appointments, professionals, selectedDate],
  )

  const visibleResources = useMemo<Record<string, boolean>>(() => {
    if (proFilter === 'todos') return {}
    return Object.fromEntries(professionals.map((p) => [p.id, p.id === proFilter]))
  }, [proFilter, professionals])

  const proHex = (id: string): string => {
    const key: ProColorKey = proColorKey(id)
    return key === 'green' ? theme.palette.success.main : theme.palette.data[key].main
  }

  const detailAppointment = detailId
    ? (appointments.find((a) => a.id === detailId) ?? null)
    : null
  const detailPro = professionals.find((p) => p.id === detailAppointment?.employeeId)

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = (appointment: Appointment) => {
    setAppointments((prev) => [...prev, appointment])
    showToast('Agendamento criado com sucesso!', 'success')
  }

  const handleChangeStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    showToast(STATUS_TOAST[status], status === 'cancelado' ? 'info' : 'success')
  }

  // Reconcilia mover/redimensionar/excluir feitos na grade nativa do scheduler.
  const handleEventsChange = (next: SchedulerEvent[]) => {
    const byId = new Map(next.map((e) => [String(e.id), e]))
    setAppointments((prev) =>
      prev
        .filter((a) => byId.has(a.id))
        .map((a) => {
          const e = byId.get(a.id)!
          const durationMinutes = Math.max(5, dayjs(e.end).diff(dayjs(e.start), 'minute'))
          const employeeId = typeof e.resource === 'string' ? e.resource : a.employeeId
          return { ...a, start: e.start, durationMinutes, employeeId }
        }),
    )
  }

  const openNew = () => {
    setPrefill(null)
    setNewOpen(true)
  }

  const headerTitle = `${DOW_FULL[selectedDate.day()]}, ${selectedDate.date()} de ${MONTHS[selectedDate.month()]}`

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h1">Agendamentos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {headerTitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <DatePicker
            value={selectedDate}
            onChange={(value) => value && setSelectedDate(value)}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_, next: AgendaView | null) => next && setView(next)}
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                px: 2,
                borderColor: 'border.subtle',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'text.primary',
                  color: 'background.paper',
                  '&:hover': { bgcolor: 'text.primary' },
                },
              },
            }}
          >
            <ToggleButton value="day">Dia</ToggleButton>
            <ToggleButton value="week">Semana</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="ghost"
            size="small"
            startIcon={<TodayOutlined />}
            onClick={() => setSelectedDate(dayjs())}
          >
            Hoje
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddRounded />}
            onClick={openNew}
          >
            Novo agendamento
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <KpiCards kpis={kpis} />

      {/* Faixa da semana */}
      <WeekStrip
        selectedDate={selectedDate}
        appointments={appointments}
        onSelectDay={(day) => {
          setSelectedDate(day)
          setView('day')
        }}
      />

      {/* Timeline + painel lateral */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
          {/* Filtro por profissional */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              clickable
              label="Todos"
              variant={proFilter === 'todos' ? 'filled' : 'outlined'}
              onClick={() => setProFilter('todos')}
              sx={
                proFilter === 'todos'
                  ? { bgcolor: 'text.primary', color: 'background.paper', fontWeight: 600 }
                  : { borderColor: 'border.subtle', color: 'text.secondary' }
              }
            />
            {professionals.map((pro) => {
              const selected = proFilter === pro.id
              return (
                <Chip
                  key={pro.id}
                  clickable
                  label={pro.name}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setProFilter(selected ? 'todos' : pro.id)}
                  avatar={
                    <Box
                      sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: proHex(pro.id) }}
                    />
                  }
                  sx={
                    selected
                      ? { bgcolor: 'text.primary', color: 'background.paper', fontWeight: 600 }
                      : { borderColor: 'border.subtle', color: 'text.secondary' }
                  }
                />
              )
            })}
          </Box>

          <AppointmentScheduler
            appointments={appointments}
            professionals={professionals}
            view={view}
            visibleDate={selectedDate.toDate()}
            visibleResources={visibleResources}
            onViewChange={setView}
            onVisibleDateChange={(date) => setSelectedDate(dayjs(date))}
            onEventsChange={handleEventsChange}
          />
        </Box>

        <SidePanel
          appointments={appointments}
          professionals={professionals}
          selectedDate={selectedDate}
          isToday={isToday}
          onOpenDetail={(id) => setDetailId(id)}
        />
      </Box>

      {/* Modais */}
      <NewAppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        professionals={professionals}
        services={services}
        customers={customers}
        appointments={appointments}
        prefill={prefill}
        defaultDate={selectedDate}
        onCreate={handleCreate}
      />

      <AppointmentDetailModal
        open={!!detailAppointment}
        appointment={detailAppointment}
        professional={detailPro}
        onClose={() => setDetailId(null)}
        onChangeStatus={handleChangeStatus}
      />
    </Box>
  )
}
