import { useEffect } from 'react'
import { Box, Dialog, DialogContent, TextField, useMediaQuery, useTheme } from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import ModalHeader from '../../../../../components/ModalHeader'
import FormModalActions from '../../../../../components/FormModalActions'
import FieldLabel from '../../../../../components/FieldLabel'
import CurrencyField from '../../../../../components/CurrencyField'
import { useUpdatePlan } from '../../../../hooks/useAdmin'
import type { AdminPlan } from '../../../../types/admin.types'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  description: z.string(),
  priceReais: z.number().min(0, 'Preço inválido.'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  plan: AdminPlan | null
  onClose: () => void
}

// Edição de plano — a mutação de billing permitida nesta fase. Só nome/descrição/preço (o que o
// backend aceita em PUT /api/admin/plans/{id}); módulos e limites são do catálogo de código.
export default function EditPlanModal({ open, plan, onClose }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const updatePlan = useUpdatePlan()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', priceReais: 0 },
  })

  useEffect(() => {
    if (open && plan) {
      reset({ name: plan.name, description: plan.description ?? '', priceReais: plan.priceCents / 100 })
    }
  }, [open, plan, reset])

  const handleClose = () => {
    if (updatePlan.isPending) return
    onClose()
  }

  const onSubmit = (values: FormValues) => {
    if (!plan) return
    updatePlan.mutate(
      {
        id: plan.id,
        payload: {
          name: values.name,
          description: values.description.trim() || null,
          priceCents: Math.round(values.priceReais * 100),
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <ModalHeader title="Editar plano" subtitle={plan?.name} onClose={handleClose} disabled={updatePlan.isPending} />
      <DialogContent>
        <Box
          component="form"
          id="edit-plan-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box>
            <FieldLabel label="Nome" required />
            <TextField
              {...register('name')}
              fullWidth
              size="small"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Box>
          <Box>
            <FieldLabel label="Descrição" />
            <TextField {...register('description')} fullWidth size="small" multiline minRows={2} />
          </Box>
          <Box>
            <FieldLabel label="Preço" required />
            <Controller
              control={control}
              name="priceReais"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  fullWidth
                  size="small"
                  error={!!errors.priceReais}
                  helperText={errors.priceReais?.message}
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>
      <FormModalActions
        formId="edit-plan-form"
        onCancel={handleClose}
        isPending={updatePlan.isPending}
        submitLabel="Salvar"
      />
    </Dialog>
  )
}
