import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import { useState, useEffect } from 'react'
import { useAdjustStock } from '../../../../hooks/useProducts'
import ModalHeader from '../../../../components/ModalHeader'
import FormModalActions from '../../../../components/FormModalActions'
import type { AdjustStockModalProps } from './types'

export default function AdjustStockModal({ open, onClose, product }: AdjustStockModalProps) {
  const [quantity, setQuantity] = useState(0)
  const adjustStock = useAdjustStock()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (open) setQuantity(0)
  }, [open])

  const newStock = product.stock + quantity
  const isInvalid = newStock < 0 || quantity === 0

  const handleSubmit = async () => {
    await adjustStock.mutateAsync({ id: product.id, quantity })
    onClose()
  }

  const handleClose = () => {
    if (adjustStock.isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title="Ajustar estoque"
        subtitle={product.name}
        onClose={handleClose}
        disabled={adjustStock.isPending}
      />

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'surface.sunken',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Estoque atual
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {product.stock} unidades
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, color: 'text.secondary', display: 'block', mb: 0.75 }}
            >
              Ajuste (+/–)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setQuantity((q) => q - 1)}
                sx={{ border: '1px solid', borderColor: 'border.subtle', borderRadius: 1.5 }}
              >
                <RemoveRounded sx={{ fontSize: 16 }} />
              </IconButton>
              <TextField
                size="small"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { style: { textAlign: 'center' } } }}
              />
              <IconButton
                size="small"
                onClick={() => setQuantity((q) => q + 1)}
                sx={{ border: '1px solid', borderColor: 'border.subtle', borderRadius: 1.5 }}
              >
                <AddRounded sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 2,
              bgcolor: newStock < 0 ? 'error.soft' : 'success.soft',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Novo estoque
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: newStock < 0 ? 'error.main' : 'success.main' }}
            >
              {newStock < 0 ? 'Inválido' : `${newStock} unidades`}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        onCancel={handleClose}
        onSubmit={handleSubmit}
        isPending={adjustStock.isPending}
        submitDisabled={isInvalid}
        submitLabel="Confirmar ajuste"
        showRequiredHint={false}
      />
    </Dialog>
  )
}
