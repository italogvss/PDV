import { Help } from '@mui/icons-material'
import { Box, Button, MenuItem, Select, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { Props } from './types'

export default function PageHeader({ title, description, children, showHelp = true, helpUrl = '/ajuda', sortOptions, sortValue, onSortChange }: Props) {
  const navigate = useNavigate()
  const hasActions = children || (sortOptions && sortOptions.length > 0)
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, width: '100%', flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="h2">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>

      {hasActions && (
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
          {showHelp && (
            <Button variant="outlined" startIcon={<Help />} onClick={() => navigate(helpUrl)}>
              Ajuda
            </Button>
          )}

          {children}

          {sortOptions && sortOptions.length > 0 && (
            <Select
              size="small"
              value={sortValue}
              onChange={(e) => onSortChange?.(e.target.value as string)}
              sx={{ fontSize: 13, minWidth: 170 }}
            >
              {sortOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>
      )}
    </Box>
  )
}
