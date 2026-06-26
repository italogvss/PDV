import {
  AccessTimeRounded,
  AttachMoneyRounded,
  LocalOfferOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material'
import { Box, Skeleton } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import { useCustomer, useCustomerStats, useDeleteCustomer, useUpdateCustomer } from '../../../hooks/useCustomers'
import { viacepService } from '../../../services/viacep.service'
import type { UpdateCustomerPayload } from '../../../types/customers.types'
import { formatBRL } from '../../../utils/currency'
import CustomerAppointmentsPanel from './components/CustomerAppointmentsPanel'
import CustomerInfoCard from './components/CustomerInfoCard'
import type { FormState } from './components/CustomerInfoCard'
import CustomerProfileHeader from './components/CustomerProfileHeader'
import CustomerRecentSales from './components/CustomerRecentSales'
import CustomerTopProducts from './components/CustomerTopProducts'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { formatMemberSince, formatRelativeDate } from './components/helpers'

function buildForm(customer: {
  name: string
  phone: string | null
  email: string | null
  document: string | null
  note: string
  address: { street: string | null; number: string | null; city: string | null; state: string | null; zipCode: string | null } | null
}): FormState {
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

  const kpiLastPurchase = stats?.lastPurchaseDate ? formatRelativeDate(stats.lastPurchaseDate) : '—'
  const memberSinceLabel = customer?.createdAt ? `Cliente desde ${formatMemberSince(customer.createdAt)}` : ''

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

  if (!customer || !form) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      <CustomerProfileHeader
        customer={customer}
        stats={stats}
        isEditing={isEditing}
        isSaving={updateCustomer.isPending}
        locationLabel={locationLabel}
        memberSinceLabel={memberSinceLabel}
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
        onDeleteClick={() => setConfirmDelete(true)}
      />

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

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' } }}>
        <CustomerInfoCard
          customer={customer}
          form={form}
          isEditing={isEditing}
          set={set}
          locationLabel={locationLabel}
          handleCepSearch={handleCepSearch}
          searching={searching}
          cepError={cepError}
          setCepError={setCepError}
        />
        <CustomerAppointmentsPanel stats={stats} statsLoading={statsLoading} />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' } }}>
        <CustomerTopProducts stats={stats} statsLoading={statsLoading} />
        <CustomerRecentSales stats={stats} statsLoading={statsLoading} />
      </Box>

      <ConfirmDialog
        open={confirmDelete}
        title="Desativar cliente?"
        description={<><strong>{customer.name}</strong> será desativado. Esta ação pode ser desfeita nas configurações.</>}
        confirmLabel="Desativar"
        isPending={deleteCustomer.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteCustomer.mutate(id!, { onSuccess: () => navigate('/clientes') })
        }}
      />

    </Box>
  )
}
