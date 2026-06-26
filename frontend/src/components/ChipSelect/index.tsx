import React from 'react'
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
          const hasIcon = Boolean(opt.icon)

          const label =
            colorMode === 'dot' && hasColor && !hasIcon ? (
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
                  '& .MuiChip-icon': { color: 'common.white', fontSize: '1.3rem' },
                }
              : {
                  cursor: 'pointer',
                  bgcolor: 'text.primary',
                  color: 'background.paper',
                  borderColor: 'text.primary',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'text.primary' },
                  '& .MuiChip-icon': { color: 'background.paper', fontSize: '1.3rem' },
                }

          return (
            <Chip
              key={opt.id}
              label={label}
              icon={hasIcon ? (opt.icon as React.ReactElement) : undefined}
              size={size}
              clickable
              onClick={() => onChange(nullable && selected ? null : opt.id)}
              variant={selected ? 'filled' : 'outlined'}
              sx={
                selected
                  ? selectedSx
                  : {
                      cursor: 'pointer',
                      borderColor: 'border.subtle',
                      color: 'text.secondary',
                      '& .MuiChip-icon': { color:  'text.secondary', fontSize: '1.3rem' },
                    }
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
