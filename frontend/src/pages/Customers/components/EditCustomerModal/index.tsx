import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material'
import SaveRounded from '@mui/icons-material/SaveRounded'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useUpdateCustomer } from '../../../../hooks/useCustomers'
import type { Customer } from '../../../../types/customers.types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  document: z.string().max(18).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
  street: z.string().max(200).optional().or(z.literal('')),
  number: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string().max(9).optional().or(z.literal('')),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
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
    if (isSubmitting || updateCustomer.isPending) return
    onClose()
  }

  const isPending = isSubmitting || updateCustomer.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>Editar cliente</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('name')}
                label="Nome completo"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField
                {...register('phone')}
                label="Telefone"
                fullWidth
                placeholder="(11) 99999-9999"
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('email')}
                label="E-mail"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                {...register('document')}
                label="CPF / CNPJ"
                fullWidth
                placeholder="000.000.000-00"
                error={!!errors.document}
                helperText={errors.document?.message}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mb: -1 }}>
              Endereço (opcional)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('street')}
                label="Rua"
                sx={{ flex: 2 }}
                error={!!errors.street}
                helperText={errors.street?.message}
              />
              <TextField
                {...register('number')}
                label="Número"
                sx={{ flex: 1 }}
                error={!!errors.number}
                helperText={errors.number?.message}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('zipCode')}
                label="CEP"
                fullWidth
                placeholder="00000-000"
                error={!!errors.zipCode}
                helperText={errors.zipCode?.message}
              />
              <TextField
                {...register('city')}
                label="Cidade"
                fullWidth
                error={!!errors.city}
                helperText={errors.city?.message}
              />
              <TextField
                {...register('state')}
                label="UF"
                sx={{ width: 72 }}
                error={!!errors.state}
                helperText={errors.state?.message}
                slotProps={{ htmlInput: { maxLength: 2 } }}
              />
            </Box>

            <TextField
              {...register('note')}
              label="Observação"
              fullWidth
              multiline
              rows={3}
              placeholder="Preferências, informações especiais..."
              error={!!errors.note}
              helperText={errors.note?.message}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : <SaveRounded />}
          >
            {isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
