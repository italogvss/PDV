import { useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateSupplier, useUpdateSupplier } from '../../../../hooks/useSuppliers'
import type { SupplierFormModalProps } from './types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.').max(200),
  phone: z.string().max(20).nullable().optional(),
})

type FormValues = z.infer<typeof schema>

export default function SupplierFormModal({ open, supplier, onClose }: SupplierFormModalProps) {
  const isEdit = Boolean(supplier)
  const create = useCreateSupplier()
  const update = useUpdateSupplier()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? '',
        phone: supplier?.phone ?? '',
      })
    }
  }, [open, supplier, reset])

  const isPending = create.isPending || update.isPending

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      phone: values.phone || null,
    }

    if (isEdit && supplier) {
      await update.mutateAsync({ id: supplier.id, payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
            <TextField
              label="Nome"
              size="small"
              fullWidth
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
            />
            <TextField
              label="Telefone"
              size="small"
              fullWidth
              placeholder="(11) 99999-9999"
              {...register('phone')}
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
