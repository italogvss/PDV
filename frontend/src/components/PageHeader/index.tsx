import { Box, Typography } from '@mui/material'
import type { Props } from './types'

export default function PageHeader({ title, description, children }: Props) {
  return (
    <Box sx={{ display: 'flex',  justifyContent: 'space-between', gap: 1.5, width: '100%', flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="h2">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>

      {children && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            '& .MuiInputBase-root': { height: 36 },
            '& .MuiButton-root': { height: 36, minHeight: 36 },
            '& .MuiToggleButton-root': { height: 36 },
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}
