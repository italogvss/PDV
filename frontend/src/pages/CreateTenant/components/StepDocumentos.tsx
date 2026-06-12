import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Collapse,
  Paper,
} from '@mui/material'
import type { TaxRegime } from '../../../types/settings.types'
import type { CreateTenantFormData, FormErrors } from '../types'
import { maskCNPJ } from '../../../utils/masks'

interface StepDocumentosProps {
  data: CreateTenantFormData
  onChange: (patch: Partial<CreateTenantFormData>) => void
  errors: FormErrors
}

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: 'simples',   label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real',      label: 'Lucro Real' },
  { value: 'mei',       label: 'MEI' },
]


export default function StepDocumentos({ data, onChange, errors }: StepDocumentosProps) {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Documentos fiscais
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Necessário para emitir notas. Você pode preencher depois.
      </Typography>

      {/* Toggle preencher depois */}
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          mb: 3,
          borderRadius: 2,
          borderColor: data.skipDocuments ? 'success.main' : 'border.subtle',
          bgcolor: data.skipDocuments ? 'success.soft' : 'surface.paper',
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Preencher depois
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sem CNPJ você pode operar normalmente, mas não emite NFC-e.
          </Typography>
        </Box>
        <Switch
          checked={data.skipDocuments}
          onChange={(_, checked) => onChange({ skipDocuments: checked })}
        />
      </Paper>

      <Collapse in={!data.skipDocuments}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* CNPJ */}
          <TextField
            label="CNPJ"
            required
            fullWidth
            value={data.cnpj}
            onChange={(e) => onChange({ cnpj: maskCNPJ(e.target.value) })}
            error={!!errors.cnpj}
            helperText={errors.cnpj}
            placeholder="00.000.000/0000-00"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      BR
                    </Typography>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Razão social */}
          <TextField
            label="Razão social"
            required
            fullWidth
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            error={!!errors.companyName}
            helperText={errors.companyName}
            placeholder="Ex: Café da Esquina Comércio de Alimentos Ltda."
          />

          {/* Inscrição estadual + Regime tributário */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              label="Inscrição estadual"
              fullWidth
              value={data.stateRegistration}
              onChange={(e) => onChange({ stateRegistration: e.target.value })}
              placeholder="000.000.000.000"
              helperText="opcional"
            />
            <FormControl fullWidth>
              <InputLabel id="tax-regime-label">Regime tributário</InputLabel>
              <Select
                labelId="tax-regime-label"
                label="Regime tributário"
                value={data.taxRegime}
                onChange={(e) => onChange({ taxRegime: e.target.value as TaxRegime })}
              >
                {TAX_REGIMES.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
