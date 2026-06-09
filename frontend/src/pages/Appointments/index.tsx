import AddRounded from '@mui/icons-material/AddRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import DonutLargeOutlined from '@mui/icons-material/DonutLargeOutlined'
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined'
import PaidOutlined from '@mui/icons-material/PaidOutlined'
import TodayOutlined from '@mui/icons-material/TodayOutlined'
import {
  Box,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import type { SchedulerEvent } from '@mui/x-scheduler/models'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import { useAppointments, useChangeAppointmentStatus, useCreateAppointment, useDeleteAppointment, useUpdateAppointment } from '../../hooks/useAppointments'
import { useCustomers } from '../../hooks/useCustomers'
import { useEmployees } from '../../hooks/useEmployees'
import { useServices } from '../../hooks/useServices'
import type { Appointment, AppointmentStatus, Professional } from '../../types/appointment.types'
import { formatBRL } from '../../utils/currency'
import AppointmentDetailModal from './components/AppointmentDetailModal'
import { computeKpis } from './components/appointmentHelpers'
import AppointmentScheduler from './components/AppointmentScheduler'
import NewAppointmentModal from './components/NewAppointmentModal'
import SidePanel from './components/SidePanel'
import WeekStrip from './components/WeekStrip'
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

export default function AppointmentsPage() {
  // ─── Data da API ────────────────────────────────────────────────────────────

  const { data: employeesPage } = useEmployees(1, 100)
  const professionals = useMemo<Professional[]>(
    () =>
      (employeesPage?.data ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        specialty: e.position,
      })),
    [employeesPage],
  )

  const { data: services = [] } = useServices()
  const { data: customersPage } = useCustomers(1, 500)
  const customers = useMemo(() => customersPage?.data ?? [], [customersPage])

  // ─── Navegação ──────────────────────────────────────────────────────────────

  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [view, setView] = useState<AgendaView>('day')
  const [proFilter, setProFilter] = useState<string>('todos')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [prefill, setPrefill] = useState<NewAppointmentPrefill | null>(null)

  // Busca agendamentos da semana completa (segunda–domingo) que contém a data selecionada.
  // Mesma lógica do WeekStrip para calcular a segunda-feira.
  const monday = selectedDate.subtract((selectedDate.day() + 6) % 7, 'day')
  const weekStart = monday.format('YYYY-MM-DD')
  const weekEnd = monday.add(6, 'day').format('YYYY-MM-DD')
  const { data: appointments = [] } = useAppointments(weekStart, weekEnd)

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createAppt = useCreateAppointment()
  const updateAppt = useUpdateAppointment()
  const changeStatus = useChangeAppointmentStatus()
  const deleteAppt = useDeleteAppointment()

  // ─── KPIs e filtros ─────────────────────────────────────────────────────────

  const isToday = selectedDate.isSame(dayjs(), 'day')
  const kpis = useMemo(
    () => computeKpis(appointments, professionals, selectedDate),
    [appointments, professionals, selectedDate],
  )

  const visibleResources = useMemo<Record<string, boolean>>(() => {
    if (proFilter === 'todos') return {}
    return Object.fromEntries(professionals.map((p) => [p.id, p.id === proFilter]))
  }, [proFilter, professionals])

  const detailAppointment = detailId
    ? (appointments.find((a) => a.id === detailId) ?? null)
    : null
  const detailPro = professionals.find((p) => p.id === detailAppointment?.employeeId)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = (appointment: Appointment) => {
    createAppt.mutate({
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      employeeId: appointment.employeeId,
      serviceIds: appointment.services.map((s) => s.id),
      start: appointment.start,
      durationMinutes: appointment.durationMinutes,
      price: appointment.price,
      status: appointment.status,
      note: appointment.note,
      color: appointment.color,
    })
    setNewOpen(false)
  }

  const handleChangeStatus = (id: string, status: AppointmentStatus) => {
    changeStatus.mutate({ id, status })
  }

  const handleChangeColor = (id: string, color: string) => {
    const appt = appointments.find((a) => a.id === id)
    if (!appt) return
    updateAppt.mutate({
      id,
      payload: {
        customerId: appt.customerId,
        customerName: appt.customerName,
        customerPhone: appt.customerPhone,
        employeeId: appt.employeeId,
        serviceIds: appt.services.map((s) => s.id),
        start: appt.start,
        durationMinutes: appt.durationMinutes,
        price: appt.price,
        status: appt.status,
        note: appt.note,
        color: color || undefined,
      },
    })
  }

  // Reconcilia mover/redimensionar/excluir feitos na grade nativa do scheduler.
  const handleEventsChange = (next: SchedulerEvent[]) => {
    const byId = new Map(next.map((e) => [String(e.id), e]))

    for (const a of appointments) {
      const event = byId.get(a.id)

      if (!event) {
        deleteAppt.mutate(a.id)
        continue
      }

      const newStart = event.start as string
      const newDuration = Math.max(5, dayjs(event.end as string).diff(dayjs(event.start as string), 'minute'))
      const newEmployeeId = typeof event.resource === 'string' ? event.resource : a.employeeId

      if (newStart !== a.start || newDuration !== a.durationMinutes || newEmployeeId !== a.employeeId) {
        updateAppt.mutate({
          id: a.id,
          payload: {
            customerId: a.customerId,
            customerName: a.customerName,
            customerPhone: a.customerPhone,
            employeeId: newEmployeeId,
            serviceIds: a.services.map((s) => s.id),
            start: newStart,
            durationMinutes: newDuration,
            price: a.price,
            status: a.status,
            note: a.note,
            color: a.color,
          },
        })
      }
    }
  }

  const openNew = () => {
    setPrefill(null)
    setNewOpen(true)
  }

  const headerTitle = `${DOW_FULL[selectedDate.day()]}, ${selectedDate.date()} de ${MONTHS[selectedDate.month()]}`
  const hours = (min: number) => (min / 60).toFixed(min % 60 === 0 ? 0 : 1)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Agendamentos" description={headerTitle}>
        <DatePicker
          value={selectedDate}
          onChange={(value) => value && setSelectedDate(value)}
          format="DD/MM/YYYY"
          slotProps={{ textField: { sx: { width: 160 } } }}
        />
        <ToggleButtonGroup
          exclusive
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
        <Button variant="ghost" startIcon={<TodayOutlined />} onClick={() => setSelectedDate(dayjs())}>
          Hoje
        </Button>
        <Button variant="contained" color="success" startIcon={<AddRounded />} onClick={openNew}>
          Novo agendamento
        </Button>
      </PageHeader>

      <PageKpiGrid>
        <PageKpiCard
          icon={EventNoteOutlined}
          label="Agendamentos"
          value={kpis.count}
          badge={{ label: `${kpis.pendentes} a confirmar`, color: kpis.pendentes > 0 ? 'warning' : 'success' }}
        />
        <PageKpiCard
          icon={CheckCircleOutlineRounded}
          label="Confirmados"
          value={kpis.confirmados}
          badge={{ label: `${kpis.confirmedPct}% da agenda`, color: 'success' }}
        />
        <PageKpiCard
          icon={PaidOutlined}
          label="Receita prevista"
          value={formatBRL(kpis.revenue)}
          badge={{ label: 'serviços do dia', color: 'default' }}
        />
        <PageKpiCard
          icon={DonutLargeOutlined}
          label="Taxa de ocupação"
          value={`${kpis.occupancy}%`}
          badge={{ label: `${hours(kpis.bookedMin)}h de ${hours(kpis.availMin)}h`, color: kpis.occupancy > 70 ? 'success' : 'warning' }}
        />
      </PageKpiGrid>

      {/* Faixa da semana */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          display: 'block',
        }}
      >
        Filtrar por dia
      </Typography>
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
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.disabled',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              display: 'block',
            }}
          >
            Filtrar por profissional
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              clickable
              size="large"
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
                  size="large"
                  label={pro.name}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setProFilter(selected ? 'todos' : pro.id)}
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
            onEventClick={(id) => setDetailId(id)}
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
        onChangeColor={handleChangeColor}
      />
    </Box>
  )
}
