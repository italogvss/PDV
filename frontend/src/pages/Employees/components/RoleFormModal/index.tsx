import { Dialog, DialogContent, Box, TextField, useTheme, useMediaQuery } from '@mui/material'
import PaletteRounded from '@mui/icons-material/PaletteRounded'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { MuiColorInput } from 'mui-color-input'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import { useCreateRole, useUpdateRole } from '../../../../hooks/useTeamRoles'
import { colors } from '../../../../theme/palette'
import type { RoleFormModalProps } from './types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(255).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida — use o formato #RRGGBB'),
})

type RoleFormValues = z.infer<typeof schema>

const DEFAULT_COLOR = '#6B7280'

export default function RoleFormModal({ open, editRole, onClose }: RoleFormModalProps) {
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const isPending = createRole.isPending || updateRole.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))


  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', color: DEFAULT_COLOR },
  })

  const watchColor = watch('color')
  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(watchColor)
  const presetColors = Object.values(colors.data).map((c) => c.main)

  useEffect(() => {
    if (open) {
      reset({
        name: editRole?.name ?? '',
        description: editRole?.description ?? '',
        color: editRole?.color ?? DEFAULT_COLOR,
      })
    }
  }, [open, editRole, reset])

  const onSubmit = (values: RoleFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      color: values.color,
    }
    const mutation = editRole
      ? updateRole.mutateAsync({ id: editRole.id, payload })
      : createRole.mutateAsync(payload)
    mutation.then(onClose)
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title={editRole ? 'Editar papel' : 'Novo papel'}
        subtitle={editRole ? 'Altere o nome, descrição ou cor do papel.' : 'Crie um papel personalizado para a sua equipe.'}
        onClose={handleClose}
        disabled={isPending}
      />
      <DialogContent sx={{ pt: 2 }}>
        <Box
          component="form"
          id="role-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Box>
            <FieldLabel label="Nome" required />
            <TextField
              {...register('name')}
              size="small"
              fullWidth
              placeholder="ex: Supervisor"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Box>

          <Box>
            <FieldLabel label="Descrição" />
            <TextField
              {...register('description')}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="O que este papel pode fazer?"
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          </Box>

          <Box>
            <FieldLabel label="Cor" required />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
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
                      '&:hover': { opacity: 0.85 },
                    }}
                  >
                    <PaletteRounded sx={{ fontSize: 14, color: isCustom ? 'common.white' : 'text.secondary', pointerEvents: 'none', position: 'relative', zIndex: 1 }} />
                    <MuiColorInput
                      format="hex"
                      value={isValidColor ? watchColor : DEFAULT_COLOR}
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
        formId="role-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={editRole ? 'Salvar alterações' : 'Criar papel'}
        pendingLabel="Salvando..."
        showRequiredHint={false}
      />
    </Dialog>
  )
}
