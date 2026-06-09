import { useEffect } from 'react'
import { Dialog, DialogContent, TextField, Box } from '@mui/material'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateSupplier, useUpdateSupplier } from '../../../../hooks/useSuppliers'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
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
  const isPending = create.isPending || update.isPending

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

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <ModalHeader
        title={isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}
        subtitle={isEdit ? 'Atualize os dados do fornecedor' : 'Cadastre um fornecedor'}
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="supplier-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box>
            <FieldLabel label="Nome" required />
            <TextField
              fullWidth
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
            />
          </Box>
          <Box>
            <FieldLabel label="Telefone" />
            <TextField
              fullWidth
              placeholder="(11) 99999-9999"
              {...register('phone')}
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
            />
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="supplier-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEdit ? 'Salvar alterações' : 'Salvar'}
        showRequiredHint={false}
      />
    </Dialog>
  )
}
