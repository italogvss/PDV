import {
  Dialog,
  DialogContent,
  Box,
  TextField,
} from '@mui/material'
import PaletteRounded from '@mui/icons-material/PaletteRounded'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { MuiColorInput } from 'mui-color-input'
import ModalHeader from '../ModalHeader'
import FieldLabel from '../FieldLabel'
import FormModalActions from '../FormModalActions'
import type { CategoryFormModalProps } from './types'
import { colors } from '../../theme/palette'


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
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#6B7280' },
  })

  const watchColor = watch('color')
  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(watchColor)
  const presetColors = Object.values(colors.data).map((color) => color.main)

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
      <ModalHeader
        title={isEditing ? 'Editar categoria' : 'Nova categoria'}
        subtitle={isEditing ? 'Edite a categoria' : 'Organize seus itens por categoria'}
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent sx={{ pt: 2 }}>
        <Box
          component="form"
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Box>
            <FieldLabel label="Nome" required />
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
            <FieldLabel label="Cor" required />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
              {presetColors.map((c) => (
                <Box
                  key={c}
                  onClick={() => setValue('color', c, { shouldValidate: true })}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: c,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: watchColor.toLowerCase() === c.toLowerCase() ? 'text.primary' : 'transparent',
                    transition: 'border-color 0.1s',
                    '&:hover': { borderColor: 'text.primary' },
                  }}
                />
              ))}
              {(() => {
                const isCustom = isValidColor && !presetColors.some((c) => c.toLowerCase() === watchColor.toLowerCase())
                return (
                  <Box
                    title="Cor personalizada"
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: isCustom ? 'text.primary' : 'border.subtle',
                      bgcolor: isCustom ? watchColor : 'surface.sunken',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color 0.1s',
                      '&:hover': { opacity: 0.85, },
                    }}
                  >
                    <PaletteRounded sx={{ fontSize: 14, color: isCustom ? 'common.white' : 'text.secondary', pointerEvents: 'none', position: 'relative', zIndex: 1 }} />
                    <MuiColorInput
                      format="hex"
                      value={isValidColor ? watchColor : '#10128b'}
                      onChange={(color) => setValue('color', color, { shouldValidate: true })}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        '& .MuiInputBase-root': { p: 0, height: '100%', minHeight: 0 },
                        '& input': { display: 'none' },
                        '& .MuiInputAdornment-root': { m: 0, height: '100%', maxHeight: 'none' },
                        '& button': { position: 'absolute', inset: 0, width: '100%', height: '100%', minWidth: 0, p: 0 },
                        '& fieldset': { display: 'none' },
                      }}
                    />
                  </Box>
                )
              })()}
            </Box>
            
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="category-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
        showRequiredHint={false}
      />
    </Dialog>
  )
}
