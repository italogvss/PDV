import {
  CalendarMonthOutlined,
  CheckRounded,
  DeleteOutlineRounded,
  EditRounded,
  EmailOutlined,
  LocationOnOutlined,
  PhoneOutlined,
  StarRounded,
} from '@mui/icons-material'
import { Avatar, Box, Button, Chip, CircularProgress, Typography } from '@mui/material'
import type { Customer } from '../../../../types/customers.types'
import type { CustomerCrmStats } from '../../../../services/customer.service'
import { getInitials } from './helpers'
import { PAYMENT_METHOD_LABELS } from '../../../../constants/payment'

interface Props {
  customer: Customer
  stats: CustomerCrmStats | undefined
  isEditing: boolean
  isSaving: boolean
  locationLabel: string | null
  memberSinceLabel: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDeleteClick: () => void
}

export default function CustomerProfileHeader({
  customer,
  stats,
  isEditing,
  isSaving,
  locationLabel,
  memberSinceLabel,
  onEdit,
  onCancel,
  onSave,
  onDeleteClick,
}: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            width: 56,
            height: 56,
            fontSize: 18,
            fontWeight: 700,
            bgcolor: 'success.main',
            color: 'common.white',
            flexShrink: 0,
          }}
        >
          {getInitials(customer.name)}
        </Avatar>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h2">{customer.name}</Typography>
            {stats?.preferredPaymentMethod && (
              <Chip
                size="small"
                icon={<StarRounded />}
                label={PAYMENT_METHOD_LABELS[stats.preferredPaymentMethod] ?? stats.preferredPaymentMethod}
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
            {customer.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{customer.email}</Typography>
              </Box>
            )}
            {customer.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{customer.phone}</Typography>
              </Box>
            )}
            {locationLabel && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{locationLabel}</Typography>
              </Box>
            )}
            {memberSinceLabel && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarMonthOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{memberSinceLabel}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {isEditing ? (
          <>
            <Button variant="outlined" size="small" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <CheckRounded />}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteOutlineRounded />}
              onClick={onDeleteClick}
            >
              Excluir
            </Button>
            <Button variant="outlined" size="small" startIcon={<EditRounded />} onClick={onEdit}>
              Editar
            </Button>
          </>
        )}
      </Box>
    </Box>
  )
}
