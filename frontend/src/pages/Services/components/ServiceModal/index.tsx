import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Skeleton,
  Switch,
  FormControlLabel,
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import type { TextFieldProps } from '@mui/material'
import { useCreateService, useUpdateService } from '../../../../hooks/useServices'
import { useServiceCategories } from '../../../../hooks/useServiceCategories'
import type { ServiceModalProps } from './types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(300).optional().or(z.literal('')),
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

// ─── CurrencyTextField ────────────────────────────────────────────────────────

function fmtCents(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface CurrencyTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: number
  onChange: (v: number) => void
}

function CurrencyTextField({ value, onChange, onBlur, ...rest }: CurrencyTextFieldProps) {
  const [display, setDisplay] = useState(() => fmtCents(value))

  useEffect(() => {
    setDisplay(fmtCents(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const cents = parseInt(digits || '0', 10)
    const reals = cents / 100
    setDisplay(fmtCents(reals))
    onChange(reals)
  }

  return (
    <TextField
      {...rest}
      value={display}
      onChange={handleChange}
      onBlur={onBlur as TextFieldProps['onBlur']}
      onFocus={(e) => e.target.select()}
      slotProps={{
        ...rest.slotProps,
        input: {
          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          ...(rest.slotProps?.input as object),
        },
        htmlInput: { inputMode: 'numeric', ...(rest.slotProps?.htmlInput as object) },
      }}
    />
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ServiceModal({ open, onClose, service }: ServiceModalProps) {
  const isEditing = !!service
  const createService = useCreateService()
  const updateService = useUpdateService()
  const { data: categories = [], isLoading: isLoadingCategories } = useServiceCategories()
  const isPending = createService.isPending || updateService.isPending

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {isEditing ? 'Editar serviço' : 'Novo serviço'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {isEditing
                ? 'Edite as informações do serviço'
                : 'Cadastre um serviço oferecido pelo seu negócio'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={isPending} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          component="form"
          id="service-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}
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
              rows={2}
              placeholder="Descreva brevemente o serviço (opcional)"
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
                  <CurrencyTextField
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
            {isLoadingCategories ? (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" width={80} height={28} />
                ))}
              </Box>
            ) : (
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    {categories.length === 0 && (
                      <Typography variant="caption" color="text.disabled">
                        Nenhuma categoria cadastrada. Adicione na tela de serviços.
                      </Typography>
                    )}
                    {categories.map((cat) => (
                      <Chip
                        key={cat.id}
                        label={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color }} />
                            {cat.name}
                          </Box>
                        }
                        size="medium"
                        onClick={() => field.onChange(field.value === cat.id ? null : cat.id)}
                        color={field.value === cat.id ? 'success' : 'default'}
                        variant={field.value === cat.id ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
              />
            )}
          </Box>

          {/* Status */}
          {isEditing && (
            <Box>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        color="success"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Serviço {field.value ? 'ativo' : 'inativo'}
                      </Typography>
                    }
                  />
                )}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
          ✓ Os campos com * são obrigatórios
        </Typography>
        <Button variant="ghost" onClick={handleClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="service-form"
          variant="contained"
          color="success"
          disabled={isPending || isSubmitting}
          startIcon={
            isPending ? <CircularProgress size={14} color="inherit" /> : <CheckRounded />
          }
        >
          {isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar serviço'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FieldLabelProps {
  label: string
  required?: boolean
  inline?: boolean
}

function FieldLabel({ label, required, inline }: FieldLabelProps) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 500,
        color: 'text.secondary',
        display: inline ? 'inline' : 'block',
        mb: inline ? 0 : 0.5,
      }}
    >
      {label}
      {required && (
        <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.25 }}>
          *
        </Typography>
      )}
    </Typography>
  )
}
