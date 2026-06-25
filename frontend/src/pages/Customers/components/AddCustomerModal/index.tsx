import { zodResolver } from '@hookform/resolvers/zod'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControl,
  MenuItem,
  Select,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import { useCreateCustomer } from '../../../../hooks/useCustomers'
import { viacepService } from '../../../../services/viacep.service'
import { formatPhone, maskCEP, maskDocument } from '../../../../utils/masks'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  phone: z.string()
    .refine(v => !v || [10, 11].includes(v.replace(/\D/g, '').length), 'Telefone inválido')
    .optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').max(200).optional().or(z.literal('')),
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

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

interface AddCustomerModalProps {
  open: boolean
  onClose: () => void
}

export default function AddCustomerModal({ open, onClose }: AddCustomerModalProps) {
  const createCustomer = useCreateCustomer()
  const isPending = createCustomer.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [searching, setSearching] = useState(false)
  const [cepError, setCepError] = useState('')

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AddCustomerForm>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  async function handleCepSearch() {
    setCepError('')
    setSearching(true)
    try {
      const address = await viacepService.lookup(getValues('zipCode') ?? '')
      setValue('street', address.street)
      setValue('city', address.city)
      setValue('state', address.stateCode)
    } catch (err) {
      setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
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

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="CEP" />
              <Controller
                name="zipCode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => {
                      setCepError('')
                      field.onChange(maskCEP(e.target.value))
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCepSearch() }}
                    placeholder="00000-000"
                    fullWidth
                    error={!!errors.zipCode || !!cepError}
                    helperText={cepError || errors.zipCode?.message}
                  />
                )}
              />
            </Box>
            <Box sx={{ pt: '22px' }}>
              <Button
                variant="outlined"
                startIcon={searching ? <CircularProgress size={14} /> : <SearchIcon />}
                onClick={handleCepSearch}
                disabled={searching}
              >
                Buscar endereço
              </Button>
            </Box>
          </Box>

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
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.state}>
                    <Select {...field} displayEmpty>
                      <MenuItem value=""><em>—</em></MenuItem>
                      {STATES.map((uf) => (
                        <MenuItem key={uf} value={uf}>{uf}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
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
