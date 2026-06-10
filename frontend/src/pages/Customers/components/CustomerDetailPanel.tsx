import { useState } from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import PlaceOutlined from '@mui/icons-material/PlaceOutlined'
import type { Customer } from '../../../types/customers.types'

interface CustomerDetailPanelProps {
  customer?: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customerId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function CustomerDetailPanel({ customer, onEdit, onDelete }: CustomerDetailPanelProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!customer) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.tertiary">Selecione um cliente para ver detalhes</Typography>
        </CardContent>
      </Card>
    )
  }

  const handleWhatsApp = () => {
    setMenuAnchor(null)
    const phone = customer.phone?.replace(/\D/g, '')
    if (phone) window.open(`https://wa.me/55${phone}`, '_blank')
  }

  const handleEdit = () => {
    setMenuAnchor(null)
    onEdit(customer)
  }

  const handleDeleteConfirm = () => {
    setConfirmOpen(false)
    onDelete(customer.id)
  }

  const fullAddress = customer.address
    ? [
        customer.address.street,
        customer.address.number ? `nº ${customer.address.number}` : null,
        customer.address.city,
        customer.address.state,
        customer.address.zipCode,
      ]
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {getInitials(customer.name)}
              </Avatar>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 600 }}>
                  {customer.name}
                </Typography>
                {customer.document && (
                  <Typography variant="caption" color="text.tertiary">
                    {customer.document}
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Ações dropdown */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {customer.phone && (
          <MenuItem onClick={handleWhatsApp}>
            <WhatsApp sx={{ fontSize: 18, color: '#25D366', mr: 1 }} />
            WhatsApp
          </MenuItem>
        )}
        <MenuItem onClick={handleEdit}>
          <EditRounded sx={{ fontSize: 18, mr: 1 }} />
          Editar
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            setConfirmOpen(true)
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteOutlineRounded sx={{ fontSize: 18, color: 'error.main', mr: 1 }} />
          Deletar
        </MenuItem>
      </Menu>

      {/* Confirmação de delete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Deletar cliente?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{customer.name}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Deletar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contato */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}
              >
                Telefone
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {customer.phone ?? '—'}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}
              >
                E-mail
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                {customer.email ?? '—'}
              </Typography>
            </Box>
          </Box>

          {fullAddress && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <PlaceOutlined sx={{ fontSize: 16, color: 'text.tertiary', mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}
                  >
                    Endereço
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fullAddress}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Observação */}
      {customer.note && (
        <Card>
          <CardContent>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}
            >
              Observação
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {customer.note}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
