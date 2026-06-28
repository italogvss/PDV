import {
  CheckRounded,
  DeleteOutlineRounded,
  EditRounded,
} from '@mui/icons-material'
import { Avatar, Box, Button, CircularProgress, Typography } from '@mui/material'
import type { DetailProfileHeaderProps } from './types'

function getInitials(name: string) {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function DetailProfileHeader({
  name,
  avatarColor,
  titleAdornment,
  meta,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  onDeleteClick,
  deleteLabel = 'Desativar',
}: DetailProfileHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            width: 56,
            height: 56,
            fontSize: 18,
            fontWeight: 700,
            bgcolor: avatarColor,
            color: 'common.white',
            flexShrink: 0,
          }}
        >
          {getInitials(name)}
        </Avatar>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h2">{name}</Typography>
            {titleAdornment}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
            {meta.map(({ icon: Icon, text }, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Icon sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography variant="caption" color="text.secondary">{text}</Typography>
              </Box>
            ))}
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
              {deleteLabel}
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
