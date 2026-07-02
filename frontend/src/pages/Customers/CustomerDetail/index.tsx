import {
  AccessTimeRounded,
  AttachMoneyRounded,
  CalendarMonthOutlined,
  EmailOutlined,
  LocalOfferOutlined,
  LocationOnOutlined,
  PhoneOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material'
import { Box, Skeleton } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import DetailProfileHeader from '../../../components/DetailProfileHeader'
import type { DetailMetaItem } from '../../../components/DetailProfileHeader/types'
import { useCustomer, useCustomerStats, useDeleteCustomer, useUpdateCustomer } from '../../../hooks/useCustomers'
import { viacepService } from '../../../services/viacep.service'
import type { UpdateCustomerPayload } from '../../../types/customers.types'
import { formatBRL } from '../../../utils/currency'
import CustomerAppointmentsPanel from './components/CustomerAppointmentsPanel'
import CustomerInfoCard from './components/CustomerInfoCard'
import type { FormState } from './components/CustomerInfoCard'
import CustomerRecentSales from './components/CustomerRecentSales'
import CustomerTopProducts from './components/CustomerTopProducts'
import CustomerSpendTimeline from './components/CustomerSpendTimeline'
import CustomerCategoryPie from './components/CustomerCategoryPie'
import ConfirmDialog from '../../../components/ConfirmDialog'
import UpsellCard from '../../../components/UpsellCard'
import { formatMemberSince, formatRelativeDate } from './components/helpers'
import { useUserPermissions } from '../../../hooks/useUserPermissions'
import { useEntitlements } from '../../../hooks/useSubscription'
import { FEATURES } from '../../../constants/entitlements'

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
  const { isModuleEnabled } = useUserPermissions()
  const { has } = useEntitlements()
  // Feature Pro: dados analíticos do cliente (KPIs, gráficos, histórico). Sem ela, o endpoint
  // /stats retorna 402 — então mostramos só o cadastro e um card de upsell no lugar.
  const showStats = has(FEATURES.informativeCustomerData)
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

  const meta = useMemo<DetailMetaItem[]>(() => {
    if (!customer) return []
    const items: DetailMetaItem[] = []
    if (customer.email) items.push({ icon: EmailOutlined, text: customer.email })
    if (customer.phone) items.push({ icon: PhoneOutlined, text: customer.phone })
    if (locationLabel) items.push({ icon: LocationOnOutlined, text: locationLabel })
    if (customer.createdAt) items.push({ icon: CalendarMonthOutlined, text: `Cliente desde ${formatMemberSince(customer.createdAt)}` })
    return items
  }, [customer, locationLabel])

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

      <DetailProfileHeader
        name={customer.name}
        avatarColor="success.main"
        meta={meta}
        isEditing={isEditing}
        isSaving={updateCustomer.isPending}
        deleteLabel="Excluir"
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
        onDeleteClick={() => setConfirmDelete(true)}
      />

      {showStats && (
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
      )}
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
        {showStats ? (
          <CustomerTopProducts stats={stats} statsLoading={statsLoading} />
        ) : (
          <UpsellCard
            title="Dados analíticos no Pro"
            description="Veja produtos mais comprados, histórico, gastos por mês e categorias de cada cliente com o plano Pro."
          />
        )}
      </Box>

      {showStats && (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
          <CustomerRecentSales stats={stats} statsLoading={statsLoading} />
          <CustomerSpendTimeline stats={stats} statsLoading={statsLoading} />
          <CustomerCategoryPie
            title="Categorias de produto"
            subtitle="Gasto por categoria · todos os períodos"
            data={stats?.productCategories}
            loading={statsLoading}
            emptyText="Nenhum produto comprado"
          />
        </Box>
      )}

      {showStats && isModuleEnabled('services') && isModuleEnabled('appointments') && (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' } }}>
          <CustomerCategoryPie
            title="Categorias de serviço"
            subtitle="Gasto por categoria · atendimentos"
            data={stats?.serviceCategories}
            loading={statsLoading}
            emptyText="Nenhum serviço realizado"
          />
          <CustomerAppointmentsPanel stats={stats} statsLoading={statsLoading} />
        </Box>
      )}
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
