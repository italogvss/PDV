import {
  AccessTimeRounded,
  AttachMoneyRounded,
  CalendarMonthOutlined,
  CheckRounded,
  DeleteOutlineRounded,
  EditRounded,
  EmailOutlined,
  LocalOfferOutlined,
  LocationOnOutlined,
  PersonOutlineRounded,
  PhoneOutlined,
  ReceiptLongOutlined,
  SearchRounded,
  StarRounded,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import SettingCard from '../../../components/SettingCard'
import { useCustomer, useCustomerStats, useDeleteCustomer, useUpdateCustomer } from '../../../hooks/useCustomers'
import type { CustomerRecentSale } from '../../../services/customer.service'
import { viacepService } from '../../../services/viacep.service'
import type { UpdateCustomerPayload } from '../../../types/customers.types'
import { formatBRL } from '../../../utils/currency'
import { formatPhone, maskCEP, maskDocument } from '../../../utils/masks'

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CreditCard: 'Crédito',
  DebitCard: 'Débito',
  Cash: 'Dinheiro',
}

const PAYMENT_COLORS: Record<string, string> = {
  PIX: '#4caf50',
  CreditCard: '#2196f3',
  DebitCard: '#ff9800',
  Cash: '#9e9e9e',
}

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  Confirmado: 'Confirmado',
  Pendente: 'Pendente',
  EmAtendimento: 'Em atendimento',
  Concluido: 'Concluído',
  Cancelado: 'Cancelado',
}

const APPOINTMENT_STATUS_COLORS: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
  Confirmado: 'success',
  Pendente: 'warning',
  EmAtendimento: 'info',
  Concluido: 'default',
  Cancelado: 'error',
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatMemberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  const diffMonths = Math.floor(diffDays / 30)
  return `há ${diffMonths} ${diffMonths !== 1 ? 'meses' : 'mês'}`
}

function formatAppointmentDate(dateStr: string) {
  const date = new Date(dateStr)
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date)
  const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  const cap = weekday.replace('.', '')
  return `${cap.charAt(0).toUpperCase() + cap.slice(1)}, ${dayMonth} · ${time}`
}

interface FormState {
  name: string
  phone: string
  email: string
  document: string
  street: string
  number: string
  city: string
  state: string
  zipCode: string
  note: string
}

function buildForm(customer: { name: string; phone: string | null; email: string | null; document: string | null; note: string; address: { street: string | null; number: string | null; city: string | null; state: string | null; zipCode: string | null } | null }): FormState {
  return {
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    document: customer.document ?? '',
    street: customer.address?.street ?? '',
    number: customer.address?.number ?? '',
    city: customer.address?.city ?? '',
    state: customer.address?.state ?? '',
    zipCode: customer.address?.zipCode ?? '',
    note: customer.note,
  }
}

function buildPayload(form: FormState): UpdateCustomerPayload {
  const hasAddress = form.street || form.number || form.city || form.state || form.zipCode
  return {
    name: form.name,
    phone: form.phone || null,
    email: form.email || null,
    document: form.document || null,
    note: form.note,
    address: hasAddress
      ? {
          street: form.street || null,
          number: form.number || null,
          city: form.city || null,
          state: form.state || null,
          zipCode: form.zipCode || null,
        }
      : null,
  }
}

const salesColumns: GridColDef<CustomerRecentSale>[] = [
  {
    field: 'shortId',
    headerName: 'Pedido',
    width: 110,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          #{row.shortId}
        </Typography>
        <Typography variant="caption" color="text.tertiary">
          {new Date(row.createdAt).toLocaleDateString('pt-BR')}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'itemsSummary',
    headerName: 'Itens',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary" noWrap>
        {row.itemsSummary}
      </Typography>
    ),
  },
  {
    field: 'paymentMethod',
    headerName: 'Forma',
    width: 110,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: PAYMENT_COLORS[row.paymentMethod] ?? 'text.disabled',
            flexShrink: 0,
          }}
        />
        <Typography variant="body2">
          {PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'total',
    headerName: 'Total',
    width: 100,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatBRL(row.total)}
      </Typography>
    ),
  },
]

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: customer, isLoading: customerLoading } = useCustomer(id!)
  const { data: stats, isLoading: statsLoading } = useCustomerStats(id!)
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [searching, setSearching] = useState(false)
  const [cepError, setCepError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (customer) setForm(buildForm(customer))
  }, [customer])

  const handleCepSearch = async () => {
    setCepError('')
    setSearching(true)
    try {
      const address = await viacepService.lookup(form?.zipCode ?? '')
      setForm((prev) => prev ? { ...prev, street: address.street, city: address.city, state: address.stateCode } : prev)
    } catch (err) {
      setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  const handleSave = () => {
    if (!form || !id) return
    updateCustomer.mutate(
      { id, payload: buildPayload(form) },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  const handleCancel = () => {
    if (customer) setForm(buildForm(customer))
    setIsEditing(false)
  }

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))

  const locationLabel = useMemo(() => {
    const c = customer?.address?.city
    const s = customer?.address?.state
    if (c && s) return `${c} / ${s}`
    if (c) return c
    if (s) return s
    return null
  }, [customer])

  const kpiLastPurchase = stats?.lastPurchaseDate
    ? formatRelativeDate(stats.lastPurchaseDate)
    : '—'

  const memberSinceLabel = customer?.createdAt
    ? `Cliente desde ${formatMemberSince(customer.createdAt)}`
    : ''

  if (customerLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rounded" height={100} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={120} />)}
        </Box>
      </Box>
    )
  }

  if (!customer) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Profile header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              fontSize: 18,
              fontWeight: 700,
              bgcolor: 'success.main',
              color: 'common.white',
              flexShrink: 0,
            }}
          >
            {getInitials(customer.name)}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h2">{customer.name}</Typography>
              {stats?.preferredPaymentMethod && (
                <Chip
                  size="small"
                  icon={<StarRounded />}
                  label={PAYMENT_LABELS[stats.preferredPaymentMethod] ?? stats.preferredPaymentMethod}
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              {customer.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmailOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                  <Typography variant="caption" color="text.secondary">{customer.email}</Typography>
                </Box>
              )}
              {customer.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                  <Typography variant="caption" color="text.secondary">{customer.phone}</Typography>
                </Box>
              )}
              {locationLabel && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                  <Typography variant="caption" color="text.secondary">{locationLabel}</Typography>
                </Box>
              )}
              {memberSinceLabel && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarMonthOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                  <Typography variant="caption" color="text.secondary">{memberSinceLabel}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {isEditing ? (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancel}
                disabled={updateCustomer.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={
                  updateCustomer.isPending
                    ? <CircularProgress size={14} color="inherit" />
                    : <CheckRounded />
                }
                onClick={handleSave}
                disabled={updateCustomer.isPending}
              >
                {updateCustomer.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteOutlineRounded />}
                onClick={() => setConfirmDelete(true)}
              >
                Excluir
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditRounded />}
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* ── 4 KPI cards ── */}
      <PageKpiGrid>
        <PageKpiCard
          icon={AttachMoneyRounded}
          label="Total gasto"
          value={statsLoading ? '...' : formatBRL(stats?.totalSpent ?? 0)}
          isLoading={statsLoading}
        />
        <PageKpiCard
          icon={ReceiptLongOutlined}
          label="Compras realizadas"
          value={statsLoading ? '...' : String(stats?.totalSales ?? 0)}
          isLoading={statsLoading}
        />
        <PageKpiCard
          icon={LocalOfferOutlined}
          label="Ticket médio"
          value={statsLoading ? '...' : formatBRL(stats?.averageTicket ?? 0)}
          isLoading={statsLoading}
        />
        <PageKpiCard
          icon={AccessTimeRounded}
          label="Última compra"
          value={statsLoading ? '...' : kpiLastPurchase}
          isLoading={statsLoading}
        />
      </PageKpiGrid>

      {/* ── Main 2-column grid ── */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' } }}>

        {/* LEFT: Dados do cliente */}
        <SettingCard
          title="Dados do cliente"
          subtitle={isEditing ? undefined : 'Clique em Editar para atualizar'}
        >
          {/* 2-col field grid */}
          {isEditing && form && (
            <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              <FieldCell label="Nome completo">
                <TextField
                  size="small"
                  fullWidth
                  value={form.name}
                  onChange={(e) => set('name')(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </FieldCell>
            </Box>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              borderColor: 'divider',
            }}
          >
            <FieldCell label="Telefone / WhatsApp" borderRight>
              {isEditing && form ? (
                <TextField
                  size="small"
                  fullWidth
                  value={form.phone}
                  onChange={(e) => set('phone')(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              ) : (
                <FieldValue value={customer.phone} icon={<PhoneOutlined sx={{ fontSize: 14 }} />} />
              )}
            </FieldCell>
            <FieldCell label="E-mail">
              {isEditing && form ? (
                <TextField
                  size="small"
                  fullWidth
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                />
              ) : (
                <FieldValue value={customer.email} icon={<EmailOutlined sx={{ fontSize: 14 }} />} />
              )}
            </FieldCell>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              borderColor: 'divider',
            }}
          >
            <FieldCell label="Documento (CPF / CNPJ)" borderRight>
              {isEditing && form ? (
                <TextField
                  size="small"
                  fullWidth
                  value={form.document}
                  onChange={(e) => set('document')(maskDocument(e.target.value))}
                  placeholder="000.000.000-00"
                />
              ) : (
                <FieldValue value={customer.document} icon={<PersonOutlineRounded sx={{ fontSize: 14 }} />} />
              )}
            </FieldCell>
            <FieldCell label="Cidade / Estado">
              {isEditing && form ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    sx={{ flex: 1 }}
                    value={form.city}
                    onChange={(e) => set('city')(e.target.value)}
                    placeholder="Cidade"
                  />
                  <Select
                    size="small"
                    value={form.state}
                    onChange={(e) => set('state')(e.target.value)}
                    displayEmpty
                    sx={{ width: 90 }}
                  >
                    <MenuItem value=""><em>UF</em></MenuItem>
                    {STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </Box>
              ) : (
                <FieldValue
                  value={locationLabel}
                  icon={<LocationOnOutlined sx={{ fontSize: 14 }} />}
                />
              )}
            </FieldCell>
          </Box>

          {isEditing && form && (
            <Box sx={{ px: 4, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* CEP + Buscar */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  CEP
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    size="small"
                    sx={{ width: 160 }}
                    value={form.zipCode}
                    onChange={(e) => { setCepError(''); set('zipCode')(maskCEP(e.target.value)) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCepSearch() }}
                    placeholder="00000-000"
                    error={!!cepError}
                    helperText={cepError}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={searching ? <CircularProgress size={14} color="inherit" /> : <SearchRounded />}
                    onClick={handleCepSearch}
                    disabled={searching}
                    sx={{ mt: '2px', flexShrink: 0 }}
                  >
                    Buscar endereço
                  </Button>
                </Box>
              </Box>
              {/* Rua + Número */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                    Rua / Logradouro
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={form.street}
                    onChange={(e) => set('street')(e.target.value)}
                    placeholder="Rua das Flores"
                  />
                </Box>
                <Box sx={{ width: 100 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                    Número
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={form.number}
                    onChange={(e) => set('number')(e.target.value)}
                    placeholder="123"
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* Anotações internas */}
          <Box sx={{ px: 4, py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
              <StarRounded sx={{ fontSize: 14, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                Anotações internas
              </Typography>
            </Box>
            {isEditing && form ? (
              <TextField
                multiline
                minRows={3}
                fullWidth
                size="small"
                value={form.note}
                onChange={(e) => set('note')(e.target.value)}
                placeholder="Observações sobre o cliente..."
              />
            ) : customer.note ? (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'warning.soft',
                  border: '1px solid',
                  borderColor: 'warning.main',
                  opacity: 0.8,
                }}
              >
                <Typography variant="body2" color="text.primary">
                  {customer.note}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Nenhuma anotação
              </Typography>
            )}
          </Box>
        </SettingCard>

        {/* RIGHT: Agendamentos cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Próximo agendamento */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Próximo agendamento
              </Typography>
              {stats?.nextAppointment && (
                <Chip
                  size="small"
                  color={APPOINTMENT_STATUS_COLORS[stats.nextAppointment.status] ?? 'default'}
                  label={APPOINTMENT_STATUS_LABELS[stats.nextAppointment.status] ?? stats.nextAppointment.status}
                />
              )}
            </Box>
            <Divider />
            <Box sx={{ px: 3, py: 2.5 }}>
              {statsLoading ? (
                <Skeleton variant="rounded" height={60} />
              ) : stats?.nextAppointment ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'success.soft',
                      border: '1px solid',
                      borderColor: 'success.main',
                      opacity: 0.8,
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CalendarMonthOutlined sx={{ fontSize: 18, color: 'common.white' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {stats.nextAppointment.serviceNames.join(', ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatAppointmentDate(stats.nextAppointment.start)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 10 }}>
                      {getInitials(stats.nextAppointment.employeeName)}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      {stats.nextAppointment.employeeName}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  Sem agendamentos futuros
                </Typography>
              )}
            </Box>
          </Card>

          {/* Atendimentos */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Atendimentos</Typography>
              {stats && (
                <Chip
                  size="small"
                  label={`${stats.appointmentCounts.total}×`}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
            <Divider />
            {statsLoading ? (
              <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={80} /></Box>
            ) : stats ? (
              <>
                {/* Count boxes */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <CountBox label="TOTAL" value={stats.appointmentCounts.total} />
                  <CountBox
                    label="CONCLUÍDOS"
                    value={stats.appointmentCounts.completed}
                    color="success.main"
                    bg="success.soft"
                    borderLeft
                  />
                  <CountBox
                    label="CANCELADOS"
                    value={stats.appointmentCounts.cancelled}
                    color="error.main"
                    bg="error.soft"
                    borderLeft
                  />
                </Box>

                {/* Top services */}
                {stats.topServices.length > 0 && (
                  <Box sx={{ px: 3, py: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                      Serviços mais agendados
                    </Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {stats.topServices.map((s) => (
                        <Box key={s.serviceName}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">{s.serviceName}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.count}×</Typography>
                          </Box>
                          <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
                            <Box
                              sx={{
                                height: '100%',
                                borderRadius: 2,
                                bgcolor: 'error.main',
                                width: `${(s.count / s.maxCount) * 100}%`,
                              }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            ) : null}
          </Card>

        </Box>
      </Box>

      {/* ── Bottom 2-column grid ── */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' } }}>

        {/* Top produtos */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Top produtos comprados
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Por volume · todos os períodos
            </Typography>
          </CardContent>
          <Divider />
          <Box sx={{ px: 3, py: 2 }}>
            {statsLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
              </Box>
            ) : stats && stats.topProducts.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {stats.topProducts.map((p, idx) => (
                  <Box key={p.productName}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: idx === 0 ? 'warning.main' : idx === 1 ? 'text.secondary' : 'action.selected',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'common.white', lineHeight: 1 }}>
                          {idx + 1}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                        {p.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {p.quantity}×
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                        {formatBRL(p.totalSpent)}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden', ml: 4.5 }}>
                      <Box
                        sx={{
                          height: '100%',
                          borderRadius: 2,
                          bgcolor: 'success.main',
                          width: `${(p.quantity / p.maxQuantity) * 100}%`,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Nenhuma compra registrada
              </Typography>
            )}
          </Box>
        </Card>

        {/* Compras recentes */}
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Compras recentes</Typography>
              {stats && (
                <Typography variant="caption" color="text.secondary">
                  {stats.totalSales} {stats.totalSales === 1 ? 'transação registrada' : 'transações registradas'}
                </Typography>
              )}
            </Box>
          </CardContent>
          <DataGrid
            rows={stats?.recentSales ?? []}
            columns={salesColumns}
            getRowId={(r) => r.id}
            rowHeight={56}
            disableRowSelectionOnClick
            hideFooter
            loading={statsLoading}
            sx={{
              border: 'none',
              borderTop: '1px solid',
              borderColor: 'divider',
              borderRadius: 0,
              minHeight: 200,
            }}
          />
        </Card>

      </Box>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir cliente?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{customer.name}</strong> será removido. Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteCustomer.isPending}
            startIcon={deleteCustomer.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={() => {
              deleteCustomer.mutate(id!, {
                onSuccess: () => navigate('/clientes'),
              })
            }}
          >
            {deleteCustomer.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ── Small helper components ── */

function FieldCell({
  label,
  children,
  borderRight,
}: {
  label: string
  children: React.ReactNode
  borderRight?: boolean
}) {
  return (
    <Box
      sx={{
        px: 4,
        py: 2.5,
        ...(borderRight && {
          borderRight: '1px solid',
          borderColor: 'divider',
        }),
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

function FieldValue({ value, icon }: { value: string | null | undefined; icon?: React.ReactNode }) {
  if (!value) return <Typography variant="body2" color="text.disabled">—</Typography>
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon && <Box sx={{ color: 'text.tertiary', lineHeight: 0 }}>{icon}</Box>}
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}

function CountBox({
  label,
  value,
  color,
  bg,
  borderLeft,
}: {
  label: string
  value: number
  color?: string
  bg?: string
  borderLeft?: boolean
}) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        textAlign: 'center',
        bgcolor: bg ?? 'transparent',
        ...(borderLeft && { borderLeft: '1px solid', borderColor: 'divider' }),
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ mt: 0.5, color: color ?? 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}
