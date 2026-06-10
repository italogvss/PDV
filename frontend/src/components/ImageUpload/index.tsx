import { useRef } from 'react'
import { Box, CircularProgress, IconButton, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import type { Props } from './types'

const ACCEPT = 'image/jpeg,image/png,image/webp'

/**
 * Área reutilizável de upload de imagem. Exibe a imagem atual (ou placeholder),
 * abre o seletor de arquivo ao clicar e mostra spinner durante o upload.
 */
export default function ImageUpload({
  currentUrl,
  onUpload,
  onRemove,
  isLoading = false,
  shape = 'square',
  size = 120,
  fullHeight = false,
  label,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const interactive = !disabled && !isLoading

  function handlePick() {
    if (interactive) inputRef.current?.click()
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Limpa o value para permitir re-selecionar o mesmo arquivo depois.
    event.target.value = ''
    if (file) onUpload(file)
  }

  function handleRemove(event: React.MouseEvent) {
    event.stopPropagation()
    onRemove?.()
  }

  const borderRadius = shape === 'circle' ? '50%' : 2

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        height: fullHeight ? '100%' : undefined,
      }}
    >
      <Box
        onClick={handlePick}
        sx={{
          position: 'relative',
          width: size,
          height: fullHeight ? '100%' : size,
          minHeight: fullHeight ? size : undefined,
          borderRadius,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          border: '1px dashed',
          borderColor: 'divider',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'border-color 0.2s, background-color 0.2s',
          '&:hover': interactive ? { borderColor: 'primary.main', bgcolor: 'action.selected' } : undefined,
        }}
      >
        {currentUrl ? (
          <Box
            component="img"
            src={currentUrl}
            alt={label ?? 'Imagem'}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <PhotoCameraRounded sx={{ fontSize: size * 0.32, color: 'text.disabled' }} />
        )}

        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette.common.black, 0.35),
            }}
          >
            <CircularProgress size={size * 0.3} sx={{ color: 'common.white' }} />
          </Box>
        )}

        {currentUrl && onRemove && interactive && (
          <IconButton
            size="small"
            onClick={handleRemove}
            aria-label="Remover imagem"
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'error.soft' },
            }}
          >
            <CloseRounded sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={handleChange}
      />
    </Box>
  )
}
