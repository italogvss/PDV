import {
  CalendarMonthOutlined,
  CheckRounded,
  DeleteOutlineRounded,
  EditRounded,
  EmailOutlined,
  LocationOnOutlined,
  PhoneOutlined,
} from '@mui/icons-material'
import { Avatar, Box, Button, CircularProgress, Typography } from '@mui/material'
import type { Supplier } from '../../../../types/supplier.types'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatMemberSince(createdAt: string) {
  return new Date(createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

interface Props {
  supplier: Supplier
  isEditing: boolean
  isSaving: boolean
  locationLabel: string | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDeleteClick: () => void
}

export default function SupplierProfileHeader({
  supplier,
  isEditing,
  isSaving,
  locationLabel,
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
            bgcolor: 'primary.main',
            color: 'common.white',
            flexShrink: 0,
          }}
        >
          {getInitials(supplier.name)}
        </Avatar>
        <Box>
          <Typography variant="h2">{supplier.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
            {supplier.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{supplier.email}</Typography>
              </Box>
            )}
            {supplier.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{supplier.phone}</Typography>
              </Box>
            )}
            {locationLabel && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{locationLabel}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonthOutlined sx={{ fontSize: 13, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Fornecedor desde {formatMemberSince(supplier.createdAt)}
              </Typography>
            </Box>
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
              Desativar
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
