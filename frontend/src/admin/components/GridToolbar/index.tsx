import { Box, InputAdornment, TextField } from '@mui/material'
import SearchRounded from '@mui/icons-material/SearchRounded'
import type { ReactNode } from 'react'

// Barra de topo padrão das grades do admin: busca à esquerda + filtros/ações à direita (children).
export default function GridToolbar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string
  onSearch: (value: string) => void
  placeholder: string
  children?: ReactNode
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        flexShrink: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
      }}
    >
      <TextField
        size="small"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        sx={{ m: 1, width: 300, '& .MuiOutlinedInput-root': { backgroundColor: 'surface.sunken' } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Box sx={{ flex: 1 }} />
      {children}
    </Box>
  )
}
