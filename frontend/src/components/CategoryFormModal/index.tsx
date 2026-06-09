import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import type { CategoryFormModalProps } from './types'

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
]

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida — use o formato #RRGGBB'),
})

type CategoryForm = z.infer<typeof schema>

export default function CategoryFormModal({
  open,
  onClose,
  category,
  onSave,
  isPending,
}: CategoryFormModalProps) {
  const isEditing = !!category

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#6B7280' },
  })

  const watchColor = watch('color')
  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(watchColor)

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? '',
        color: category?.color ?? '#6B7280',
      })
    }
  }, [open, category, reset])

  const onSubmit = async (data: CategoryForm) => {
    await onSave({ name: data.name, color: data.color })
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {isEditing ? 'Editar categoria' : 'Nova categoria'}
          </Typography>
          <IconButton size="small" onClick={handleClose} disabled={isPending} sx={{ mr: -0.5 }}>
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box
          component="form"
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Nome <Typography component="span" variant="caption" color="error.main">*</Typography>
            </Typography>
            <TextField
              {...register('name')}
              fullWidth
              size="small"
              placeholder="Ex: Bebidas"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', display: 'block', mb: 1 }}>
              Cor <Typography component="span" variant="caption" color="error.main">*</Typography>
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setValue('color', c, { shouldValidate: true })}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: c,
                    cursor: 'pointer',
                    border: '3px solid',
                    borderColor: watchColor === c ? 'text.primary' : 'transparent',
                    transition: 'border-color 0.1s',
                    '&:hover': { opacity: 0.85 },
                  }}
                />
              ))}
            </Box>

            <TextField
              {...register('color')}
              size="small"
              placeholder="#RRGGBB"
              error={!!errors.color}
              helperText={errors.color?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 0.5,
                        bgcolor: isValidColor ? watchColor : 'grey.300',
                        mr: 1,
                        flexShrink: 0,
                        border: '1px solid',
                        borderColor: 'border.subtle',
                      }}
                    />
                  ),
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button variant="ghost" onClick={handleClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="category-form"
          variant="contained"
          color="success"
          disabled={isPending || isSubmitting}
          startIcon={
            isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <CheckRounded />
            )
          }
        >
          {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar categoria'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
