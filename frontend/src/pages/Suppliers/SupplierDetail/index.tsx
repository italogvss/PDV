import { CalendarMonthOutlined, EmailOutlined, LocationOnOutlined, PhoneOutlined } from '@mui/icons-material'
import { Box, Skeleton } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog'
import DetailProfileHeader from '../../../components/DetailProfileHeader'
import type { DetailMetaItem } from '../../../components/DetailProfileHeader/types'
import { useSupplier, useDeleteSupplier, useUpdateSupplier } from '../../../hooks/useSuppliers'
import { viacepService } from '../../../services/viacep.service'
import type { UpdateSupplierPayload } from '../../../types/supplier.types'
import SupplierInfoCard from './components/SupplierInfoCard'
import type { FormState } from './components/SupplierInfoCard'

function buildForm(supplier: {
  name: string
  phone: string | null
  email: string | null
  document: string | null
  address: { street: string | null; number: string | null; city: string | null; state: string | null; zipCode: string | null } | null
}): FormState {
  return {
    name: supplier.name,
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    document: supplier.document ?? '',
    street: supplier.address?.street ?? '',
    number: supplier.address?.number ?? '',
    city: supplier.address?.city ?? '',
    state: supplier.address?.state ?? '',
    zipCode: supplier.address?.zipCode ?? '',
  }
}

function buildPayload(form: FormState): UpdateSupplierPayload {
  return {
    name: form.name,
    phone: form.phone || null,
    email: form.email || null,
    document: form.document || null,
    addressStreet: form.street || null,
    addressNumber: form.number || null,
    addressCity: form.city || null,
    addressState: form.state || null,
    addressZipCode: form.zipCode || null,
  }
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: supplier, isLoading } = useSupplier(id!)
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [searching, setSearching] = useState(false)
  const [cepError, setCepError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (supplier) setForm(buildForm(supplier))
  }, [supplier])

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
    updateSupplier.mutate(
      { id, payload: buildPayload(form) },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  const handleCancel = () => {
    if (supplier) setForm(buildForm(supplier))
    setIsEditing(false)
  }

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))

  const locationLabel = useMemo(() => {
    const c = supplier?.address?.city
    const s = supplier?.address?.state
    if (c && s) return `${c} / ${s}`
    if (c) return c
    if (s) return s
    return null
  }, [supplier])

  const meta = useMemo<DetailMetaItem[]>(() => {
    if (!supplier) return []
    const items: DetailMetaItem[] = []
    if (supplier.email) items.push({ icon: EmailOutlined, text: supplier.email })
    if (supplier.phone) items.push({ icon: PhoneOutlined, text: supplier.phone })
    if (locationLabel) items.push({ icon: LocationOnOutlined, text: locationLabel })
    items.push({
      icon: CalendarMonthOutlined,
      text: `Fornecedor desde ${new Date(supplier.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
    })
    return items
  }, [supplier, locationLabel])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    )
  }

  if (!supplier || !form) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <DetailProfileHeader
        name={supplier.name}
        avatarColor="primary.main"
        meta={meta}
        isEditing={isEditing}
        isSaving={updateSupplier.isPending}
        deleteLabel="Desativar"
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
        onDeleteClick={() => setConfirmDelete(true)}
      />

      <SupplierInfoCard
        supplier={supplier}
        form={form}
        isEditing={isEditing}
        set={set}
        locationLabel={locationLabel}
        handleCepSearch={handleCepSearch}
        searching={searching}
        cepError={cepError}
        setCepError={setCepError}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Desativar fornecedor?"
        description={<><strong>{supplier.name}</strong> será desativado. Esta ação pode ser desfeita nas configurações.</>}
        confirmLabel="Desativar"
        isPending={deleteSupplier.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSupplier.mutate(id!, { onSuccess: () => navigate('/fornecedores') })
        }}
      />
    </Box>
  )
}
