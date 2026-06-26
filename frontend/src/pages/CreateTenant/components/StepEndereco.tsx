import { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { CreateTenantFormData, FormErrors } from '../types'
import { viacepService } from '../../../services/viacep.service'
import { maskCEP } from '../../../utils/masks'
import { STATES } from '../../../constants/address'

interface StepEnderecoProps {
  data: CreateTenantFormData
  onChange: (patch: Partial<CreateTenantFormData>) => void
  errors: FormErrors
}

export default function StepEndereco({ data, onChange, errors }: StepEnderecoProps) {
  const [searching, setSearching] = useState(false)
  const [cepError, setCepError] = useState('')

  async function handleCepSearch() {
    setCepError('')
    setSearching(true)
    try {
      const address = await viacepService.lookup(data.cep)
      onChange({
        street: address.street,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.stateCode,
      })
    } catch (err) {
      setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Onde fica o estabelecimento?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        O endereço aparece nos recibos e na conta fiscal.
      </Typography>

      {/* CEP */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'center' }}>
        <TextField
          label="CEP"
          required
          value={data.cep}
          onChange={(e) => {
            setCepError('')
            onChange({ cep: maskCEP(e.target.value) })
          }}
          error={!!errors.cep || !!cepError}
          helperText={cepError || errors.cep}
          placeholder="00000-000"
          sx={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCepSearch()
          }}
        />
        <Button
          variant="outlined"
          startIcon={searching ? <CircularProgress size={14} /> : <SearchIcon />}
          onClick={handleCepSearch}
          disabled={searching}
          sx={{ whiteSpace: 'nowrap', py: 2 }}
        >
          Buscar endereço
        </Button>
      </Box>

      {/* Logradouro + Número */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField
          label="Logradouro"
          required
          fullWidth
          value={data.street}
          onChange={(e) => onChange({ street: e.target.value })}
          error={!!errors.street}
          helperText={errors.street}
          placeholder="Rua, avenida, travessa..."
        />
        <TextField
          label="Número"
          required
          value={data.number}
          onChange={(e) => onChange({ number: e.target.value })}
          error={!!errors.number}
          helperText={errors.number}
          placeholder="123"
          sx={{ width: { xs: '100%', sm: 120 }, flexShrink: 0 }}
        />
      </Box>

      {/* Complemento */}
      <TextField
        label="Complemento"
        fullWidth
        value={data.complement}
        onChange={(e) => onChange({ complement: e.target.value })}
        placeholder="Apto, sala, bloco..."
        helperText="opcional"
        sx={{ mb: 2.5 }}
      />

      {/* Bairro + Cidade + UF */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField
          label="Bairro"
          required
          fullWidth
          value={data.neighborhood}
          onChange={(e) => onChange({ neighborhood: e.target.value })}
          error={!!errors.neighborhood}
          helperText={errors.neighborhood}
        />
        <TextField
          label="Cidade"
          required
          fullWidth
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          error={!!errors.city}
          helperText={errors.city}
        />
        <FormControl
          required
          error={!!errors.state}
          sx={{ width: { xs: '100%', sm: 90 }, flexShrink: 0 }}
        >
          <InputLabel id="state-label">UF</InputLabel>
          <Select
            labelId="state-label"
            label="UF"
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
          >
            {STATES.map((uf) => (
              <MenuItem key={uf} value={uf}>
                {uf}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}
