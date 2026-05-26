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
import AddRounded from '@mui/icons-material/AddRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import { useState, useEffect } from 'react'
import { useAdjustStock } from '../../../../hooks/useProducts'
import type { AdjustStockModalProps } from './types'

export default function AdjustStockModal({ open, onClose, product }: AdjustStockModalProps) {
  const [quantity, setQuantity] = useState(0)
  const adjustStock = useAdjustStock()

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
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              Ajustar estoque
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {product.name}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={adjustStock.isPending} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

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

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button variant="ghost" onClick={handleClose} disabled={adjustStock.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={isInvalid || adjustStock.isPending}
          onClick={handleSubmit}
          startIcon={
            adjustStock.isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : undefined
          }
        >
          {adjustStock.isPending ? 'Salvando...' : 'Confirmar ajuste'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
