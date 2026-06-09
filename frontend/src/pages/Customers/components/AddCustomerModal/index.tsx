import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Typography,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCustomer } from '../../../../hooks/useCustomers'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'

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

type AddCustomerForm = z.infer<typeof schema>

const defaultValues: AddCustomerForm = {
  name: '',
  phone: '',
  email: '',
  document: '',
  note: '',
  street: '',
  number: '',
  city: '',
  state: '',
  zipCode: '',
}

interface AddCustomerModalProps {
  open: boolean
  onClose: () => void
}

export default function AddCustomerModal({ open, onClose }: AddCustomerModalProps) {
  const createCustomer = useCreateCustomer()
  const isPending = createCustomer.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddCustomerForm>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const onSubmit = async (data: AddCustomerForm) => {
    const hasAddress = data.street || data.number || data.city || data.state || data.zipCode
    await createCustomer.mutateAsync({
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
    })
    reset(defaultValues)
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    reset(defaultValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <ModalHeader
        title="Novo cliente"
        subtitle="Cadastre um novo cliente"
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="add-customer-form"
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
              <TextField
                {...register('phone')}
                fullWidth
                placeholder="(11) 99999-9999"
                error={!!errors.phone}
                helperText={errors.phone?.message}
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
              <TextField
                {...register('document')}
                fullWidth
                placeholder="000.000.000-00"
                error={!!errors.document}
                helperText={errors.document?.message}
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
              <TextField
                {...register('zipCode')}
                fullWidth
                placeholder="00000-000"
                error={!!errors.zipCode}
                helperText={errors.zipCode?.message}
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
        formId="add-customer-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel="Salvar"
      />
    </Dialog>
  )
}
