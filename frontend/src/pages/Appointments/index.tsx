import AddRounded from '@mui/icons-material/AddRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined'
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined'
import PaidOutlined from '@mui/icons-material/PaidOutlined'
import TableRowsRounded from '@mui/icons-material/TableRowsRounded'
import TodayOutlined from '@mui/icons-material/TodayOutlined'
import {
  Box,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { DatePicker } from '@mui/x-date-pickers'
import type { SchedulerEvent } from '@mui/x-scheduler/models'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import FilterTabs from '../../components/FilterTabs'
import type { FilterTabOption } from '../../components/FilterTabs/types'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import { useAppointments, useChangeAppointmentStatus, useCreateAppointment, useDeleteAppointment, useUpdateAppointment } from '../../hooks/useAppointments'
import { useCustomers } from '../../hooks/useCustomers'
import { useEmployees } from '../../hooks/useEmployees'
import { useServices } from '../../hooks/useServices'
import { useAppSelector } from '../../store'
import type { Appointment, AppointmentStatus, Professional } from '../../types/appointment.types'
import { APPOINTMENT_STATUS_LABELS } from '../../types/appointment.types'
import { formatBRL } from '../../utils/currency'
import AppointmentDetailModal from './components/AppointmentDetailModal'
import { computeKpis, STATUS_COLOR } from './components/appointmentHelpers'
import AppointmentScheduler from './components/AppointmentScheduler'
import NewAppointmentModal from './components/NewAppointmentModal'
import SidePanel from './components/SidePanel'
import WeekStrip from './components/WeekStrip'
import type { AgendaView, NewAppointmentPrefill } from './types'

type ViewMode = 'scheduler' | 'list'


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

  const { userId: ownerUserId, name: ownerName, role } = useAppSelector((s) => s.auth)
  const { data: employeesPage } = useEmployees(1, 100)
  const professionals = useMemo<Professional[]>(() => {
    const employees: Professional[] = (employeesPage?.data ?? [])
      .filter((e) => e.userId !== ownerUserId)
      .map((e) => ({ id: e.id, name: e.name }))
    if (role === 'Owner' && ownerUserId && ownerName) {
      return [{ id: ownerUserId, name: ownerName }, ...employees]
    }
    return employees
  }, [employeesPage, ownerUserId, ownerName, role])

  const { data: services = [] } = useServices()
  const { data: customersPage } = useCustomers(1, 500)
  const customers = useMemo(() => customersPage?.data ?? [], [customersPage])

  // ─── Navegação ──────────────────────────────────────────────────────────────

  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [view, setView] = useState<AgendaView>('day')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
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
    () => computeKpis(appointments, selectedDate),
    [appointments, professionals, selectedDate],
  )

  const proTabs = useMemo<FilterTabOption[]>(
    () => [
      { value: 'todos', label: 'Todos', color: 'primary.main' },
      ...professionals.map((pro) => ({ value: pro.id, label: pro.name, color: "primary.main" })),
    ],
    [professionals],
  )

  const visibleResources = useMemo<Record<string, boolean>>(() => {
    if (proFilter === 'todos') return {}
    return Object.fromEntries(professionals.map((p) => [p.id, p.id === proFilter]))
  }, [proFilter, professionals])

  const listAppointments = useMemo(() => {
    let filtered = appointments
    if (view === 'day') {
      filtered = filtered.filter((a) => dayjs(a.start).isSame(selectedDate, 'day'))
    }
    if (proFilter !== 'todos') {
      filtered = filtered.filter((a) => a.employeeId === proFilter)
    }
    return [...filtered].sort((a, b) => a.start.localeCompare(b.start))
  }, [appointments, view, selectedDate, proFilter])

  const listColumns = useMemo<GridColDef<Appointment>[]>(() => [
    {
      field: 'start',
      headerName: 'Início',
      width: 80,
      valueFormatter: (value: string) => dayjs(value).format('HH:mm'),
    },
    {
      field: 'end',
      headerName: 'Término',
      width: 80,
      valueGetter: (_: unknown, row: Appointment) => dayjs(row.start).add(row.durationMinutes, 'minute').format('HH:mm'),
    },
    ...(view === 'week' ? [{
      field: 'startDate',
      headerName: 'Data',
      width: 110,
      valueGetter: (_: unknown, row: Appointment) => dayjs(row.start).format('DD/MM/YYYY'),
    }] : []),
    { field: 'customerName', headerName: 'Cliente', flex: 1, minWidth: 140 },
    { field: 'employeeName', headerName: 'Profissional', width: 160 },
    {
      field: 'services',
      headerName: 'Serviços',
      flex: 1,
      minWidth: 160,
      valueGetter: (_: unknown, row: Appointment) => row.services.map((s) => s.name).join(' + '),
    },
    { field: 'durationMinutes', headerName: 'Duração', width: 90, valueFormatter: (v: number) => `${v} min` },
    { field: 'price', headerName: 'Valor', width: 110, valueFormatter: (v: number) => formatBRL(v) },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => {
        const value = params.value as AppointmentStatus
        return <Chip label={APPOINTMENT_STATUS_LABELS[value]} color={STATUS_COLOR[value]} size="small" />
      },
    },
  ], [view])

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
      employeeId: appointment.employeeId!,
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
    if (!appt.employeeId) return
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
      const newEmployeeId = typeof event.resource === 'string' ? event.resource : (a.employeeId ?? '')

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
        >
          <ToggleButton value="day">Dia</ToggleButton>
          <ToggleButton value="week">Semana</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="ghost" startIcon={<TodayOutlined />} onClick={() => setSelectedDate(dayjs())}>
          Hoje
        </Button>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openNew}>
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
        Filtrar por dia da semana
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
          {/* Filtro por profissional + toggle de visualização */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FilterTabs value={proFilter} onChange={setProFilter} options={proTabs} />
            </Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
              size="small"
              sx={{ flexShrink: 0 }}
            >
              <ToggleButton value="scheduler"><CalendarMonthRounded sx={{ fontSize: 18 }} /></ToggleButton>
              <ToggleButton value="list"><TableRowsRounded sx={{ fontSize: 18 }} /></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === 'scheduler' ? (
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
          ) : (
            <DataGrid
              rows={listAppointments}
              columns={listColumns}
              onRowClick={({ id }) => setDetailId(String(id))}
              hideFooter={listAppointments.length <= 100}
              disableColumnFilter
              disableColumnMenu
              slots={{
                noRowsOverlay: () => (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, color: 'text.disabled' }}>
                    <EventBusyOutlined sx={{ fontSize: 40 }} />
                    <Typography variant="body2">Nenhum agendamento para esta data</Typography>
                  </Box>
                ),
              }}
              sx={{ cursor: 'pointer' }}
            />
          )}
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
