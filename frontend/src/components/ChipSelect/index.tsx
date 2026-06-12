import { Box, Chip, FormHelperText, Skeleton, Typography } from '@mui/material'
import type { ChipSelectProps } from './types'

const SKELETON_HEIGHT: Record<NonNullable<ChipSelectProps['size']>, number> = {
  small: 24,
  medium: 28,
  large: 36,
}

export default function ChipSelect({
  options,
  value,
  onChange,
  loading = false,
  error,
  emptyMessage,
  size = 'medium',
  nullable = false,
  colorMode = 'dot',
}: ChipSelectProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width={80} height={SKELETON_HEIGHT[size]} />
        ))}
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        {options.length === 0 && emptyMessage && (
          <Typography variant="caption" color="text.disabled">
            {emptyMessage}
          </Typography>
        )}
        {options.map((opt) => {
          const selected = value === opt.id
          const hasColor = Boolean(opt.color)

          const label =
            colorMode === 'dot' && hasColor ? (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color }} />
                {opt.label}
              </Box>
            ) : (
              opt.label
            )

          const selectedSx =
            colorMode === 'fill' && hasColor
              ? {
                  cursor: 'pointer',
                  bgcolor: opt.color,
                  color: 'common.white',
                  borderColor: opt.color,
                  fontWeight: 600,
                  '&:hover': { bgcolor: opt.color },
                }
              : {
                  cursor: 'pointer',
                  bgcolor: 'text.primary',
                  color: 'background.paper',
                  borderColor: 'text.primary',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'text.primary' },
                }

          return (
            <Chip
              key={opt.id}
              label={label}
              size={size}
              clickable
              onClick={() => onChange(nullable && selected ? null : opt.id)}
              variant={selected ? 'filled' : 'outlined'}
              sx={
                selected
                  ? selectedSx
                  : { cursor: 'pointer', borderColor: 'border.subtle', color: 'text.secondary' }
              }
            />
          )
        })}
      </Box>
      {error && (
        <FormHelperText error sx={{ mt: 0.5 }}>
          {error}
        </FormHelperText>
      )}
    </Box>
  )
}
