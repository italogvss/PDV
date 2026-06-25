import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useUpdateCustomer } from '../../../../hooks/useCustomers'
import { formatPhone, maskDocument, maskCEP } from '../../../../utils/masks'
import type { Customer } from '../../../../types/customers.types'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  phone: z.string()
    .refine(v => !v || [10, 11].includes(v.replace(/\D/g, '').length), 'Telefone inválido')
    .optional().or(z.literal('')),
  email: z.string().email().max(200).optional().or(z.literal('')),
  document: z.string()
    .refine(v => !v || [11, 14].includes(v.replace(/\D/g, '').length), 'CPF ou CNPJ inválido')
    .optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
  street: z.string().max(200).optional().or(z.literal('')),
  number: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string()
    .refine(v => !v || v.replace(/\D/g, '').length === 8, 'CEP inválido')
    .optional().or(z.literal('')),
})

type EditCustomerForm = z.infer<typeof schema>

interface EditCustomerModalProps {
  open: boolean
  customer: Customer
  onClose: () => void
}

function toFormValues(customer: Customer): EditCustomerForm {
  return {
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    document: customer.document ?? '',
    note: customer.note,
    street: customer.address?.street ?? '',
    number: customer.address?.number ?? '',
    city: customer.address?.city ?? '',
    state: customer.address?.state ?? '',
    zipCode: customer.address?.zipCode ?? '',
  }
}

export default function EditCustomerModal({ open, customer, onClose }: EditCustomerModalProps) {
  const updateCustomer = useUpdateCustomer()
  const isPending = updateCustomer.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditCustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(customer),
  })

  useEffect(() => {
    if (open) reset(toFormValues(customer))
  }, [open, customer, reset])

  const onSubmit = async (data: EditCustomerForm) => {
    const hasAddress = data.street || data.number || data.city || data.state || data.zipCode
    await updateCustomer.mutateAsync({
      id: customer.id,
      payload: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        document: data.document || null,
        note: data.note ?? '',
        address: hasAddress
          ? {
              street: data.street || null,
              number: data.number || null,
              city: data.city || null,
              state: data.state || null,
              zipCode: data.zipCode || null,
            }
          : null,
      },
    })
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title="Editar cliente"
        subtitle="Atualize os dados do cliente"
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="edit-customer-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Nome completo" required />
              <TextField
                {...register('name')}
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Telefone" />
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    placeholder="(99) 99999-9999"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                  />
                )}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="E-mail" />
              <TextField
                {...register('email')}
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="CPF / CNPJ" />
              <Controller
                name="document"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(maskDocument(e.target.value))}
                    placeholder="000.000.000-00"
                    fullWidth
                    error={!!errors.document}
                    helperText={errors.document?.message}
                  />
                )}
              />
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mb: -1 }}>
            Endereço (opcional)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 2 }}>
              <FieldLabel label="Rua" />
              <TextField
                {...register('street')}
                fullWidth
                error={!!errors.street}
                helperText={errors.street?.message}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Número" />
              <TextField
                {...register('number')}
                fullWidth
                error={!!errors.number}
                helperText={errors.number?.message}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="CEP" />
              <Controller
                name="zipCode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(maskCEP(e.target.value))}
                    placeholder="00000-000"
                    fullWidth
                    error={!!errors.zipCode}
                    helperText={errors.zipCode?.message}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Cidade" />
              <TextField
                {...register('city')}
                fullWidth
                error={!!errors.city}
                helperText={errors.city?.message}
              />
            </Box>
            <Box sx={{ width: 96 }}>
              <FieldLabel label="UF" />
              <TextField
                {...register('state')}
                fullWidth
                error={!!errors.state}
                helperText={errors.state?.message}
                slotProps={{ htmlInput: { maxLength: 2 } }}
              />
            </Box>
          </Box>

          <Box>
            <FieldLabel label="Observação" />
            <TextField
              {...register('note')}
              fullWidth
              multiline
              rows={3}
              placeholder="Preferências, informações especiais..."
              error={!!errors.note}
              helperText={errors.note?.message}
            />
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="edit-customer-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel="Salvar alterações"
      />
    </Dialog>
  )
}
