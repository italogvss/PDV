import { SearchRounded } from '@mui/icons-material'
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { maskCEP } from '../../utils/masks'
import type { AddressEditFieldsProps } from './types'

const labelSx = {
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'text.secondary',
  display: 'block',
  mb: 0.75,
} as const

/** Bloco de edição de endereço (CEP com busca ViaCEP + rua + número). */
export default function AddressEditFields({
  zipCode,
  street,
  number,
  onZipCodeChange,
  onStreetChange,
  onNumberChange,
  onCepSearch,
  searching,
  cepError,
  onCepErrorClear,
}: AddressEditFieldsProps) {
  return (
    <Box sx={{ px: 4, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography variant="caption" sx={labelSx}>CEP</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            sx={{ width: 160 }}
            value={zipCode}
            onChange={(e) => { onCepErrorClear(); onZipCodeChange(maskCEP(e.target.value)) }}
            onKeyDown={(e) => { if (e.key === 'Enter') onCepSearch() }}
            placeholder="00000-000"
            error={!!cepError}
            helperText={cepError}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={searching ? <CircularProgress size={14} color="inherit" /> : <SearchRounded />}
            onClick={onCepSearch}
            disabled={searching}
            sx={{ mt: '2px', flexShrink: 0 }}
          >
            Buscar endereço
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={labelSx}>Rua / Logradouro</Typography>
          <TextField
            size="small"
            fullWidth
            value={street}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="Rua das Flores"
          />
        </Box>
        <Box sx={{ width: 100 }}>
          <Typography variant="caption" sx={labelSx}>Número</Typography>
          <TextField
            size="small"
            fullWidth
            value={number}
            onChange={(e) => onNumberChange(e.target.value)}
            placeholder="123"
          />
        </Box>
      </Box>
    </Box>
  )
}
