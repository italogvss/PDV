import { zodResolver } from '@hookform/resolvers/zod'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import {
  Box,
  Dialog,
  DialogContent,
  InputAdornment,
  TextField,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import ChipSelect from '../../../../components/ChipSelect'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import { useServiceCategories } from '../../../../hooks/useServiceCategories'
import { useCreateService, useUpdateService } from '../../../../hooks/useServices'
import type { ServiceModalProps } from './types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, "Não pode ter mais de 100 caracteres"),
  description: z.string().max(300, "Não pode ter mais de 300 caracteres").optional().or(z.literal('')),
  durationMinutes: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(1)
    .optional()
    .or(z.literal('')),
  price: z.number().positive('Deve ser maior que zero'),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean(),
})

type ServiceForm = z.infer<typeof schema>

function buildDefaults(): ServiceForm {
  return {
    name: '',
    description: '',
    durationMinutes: '',
    price: 0,
    categoryId: null,
    isActive: true,
  }
}

export default function ServiceModal({ open, onClose, service }: ServiceModalProps) {
  const isEditing = !!service
  const createService = useCreateService()
  const updateService = useUpdateService()
  const { data: categories = [], isLoading: isLoadingCategories } = useServiceCategories()
  const isPending = createService.isPending || updateService.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceForm>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(),
  })

  useEffect(() => {
    if (open) {
      if (service) {
        reset({
          name: service.name,
          description: service.description ?? '',
          durationMinutes: service.durationMinutes ?? '',
          price: service.price,
          categoryId: service.category?.id ?? null,
          isActive: service.isActive,
        })
      } else {
        reset(buildDefaults())
      }
    }
  }, [open, service, reset])

  const onSubmit = async (data: ServiceForm) => {
    const durationMinutesVal = typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined
    const categoryId = data.categoryId || null

    if (isEditing) {
      await updateService.mutateAsync({
        id: service.id,
        name: data.name,
        description: data.description || undefined,
        durationMinutes: durationMinutesVal,
        price: data.price,
        categoryId,
        isActive: data.isActive,
      })
    } else {
      await createService.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        durationMinutes: durationMinutesVal,
        price: data.price,
        categoryId,
        isActive: data.isActive ?? true,
      })
    }
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title={isEditing ? 'Editar serviço' : 'Novo serviço'}
        subtitle={
          isEditing
            ? 'Edite as informações do serviço'
            : 'Cadastre um serviço oferecido pelo seu negócio'
        }
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          component="form"
          id="service-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          {/* Nome */}
          <Box>
            <FieldLabel label="Nome do serviço" required />
            <TextField
              {...register('name')}
              fullWidth
              size="small"
              placeholder="Ex: Corte de cabelo masculino"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Box>

          {/* Descrição */}
          <Box>
            <FieldLabel label="Descrição" />
            <TextField
              {...register('description')}
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Descreva brevemente o serviço (opcional)"
              slotProps={{ input: { sx: { maxHeight: 280, overflowY: 'auto' } } }}
              error={!!errors.description}
              helperText={errors.description?.message as string}
            />
          </Box>

          {/* Preço + Duração */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Preço" required />
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    value={Number(field.value) || 0}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    fullWidth
                    size="small"
                    error={!!errors.price}
                    helperText={errors.price?.message}
                  />
                )}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Duração (minutos)" />
              <TextField
                {...register('durationMinutes')}
                fullWidth
                size="small"
                type="number"
                placeholder="Ex: 60"
                error={!!errors.durationMinutes}
                helperText={errors.durationMinutes?.message as string}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, step: 1 },
                }}
              />
            </Box>
          </Box>

          {/* Categoria */}
          <Box>
            <FieldLabel label="Categoria" />
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <ChipSelect
                  options={categories.map((cat) => ({ id: cat.id, label: cat.name, color: cat.color }))}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  loading={isLoadingCategories}
                  emptyMessage="Nenhuma categoria cadastrada. Adicione na tela de serviços."
                  size="large"
                  colorMode="fill"
                  nullable
                />
              )}
            />
          </Box>

        </Box>
      </DialogContent>

      <FormModalActions
        formId="service-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
      />
    </Dialog>
  )
}
