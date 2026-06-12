import { Box, Typography, Switch, TextField, Paper, Collapse } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { DayOfWeek, HoursPreset, BusinessHours } from '../../../types/settings.types'
import type { CreateTenantFormData } from '../types'
import { DEFAULT_HOURS_PRESETS } from '../types'

interface StepHorarioProps {
  data: CreateTenantFormData
  onChange: (patch: Partial<CreateTenantFormData>) => void
}

const PRESETS: { value: HoursPreset; label: string; description: string }[] = [
  { value: 'comercial',    label: 'Comercial',   description: 'Seg-Sex 8h-18h, Sáb 8h-13h' },
  { value: 'estendido',    label: 'Estendido',   description: 'Todos os dias 7h-22h' },
  { value: '24horas',      label: '24 horas',    description: 'Sempre aberto' },
  { value: 'personalizado', label: 'Personalizado', description: 'Eu defino os horários' },
]

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday',    label: 'Segunda' },
  { key: 'tuesday',   label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday',  label: 'Quinta' },
  { key: 'friday',    label: 'Sexta' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]

export default function StepHorario({ data, onChange }: StepHorarioProps) {
  function handlePresetSelect(preset: HoursPreset) {
    if (preset === 'personalizado') {
      onChange({ hoursPreset: 'personalizado' })
      return
    }
    onChange({
      hoursPreset: preset,
      businessHours: DEFAULT_HOURS_PRESETS[preset],
    })
  }

  function patchDay(day: DayOfWeek, patch: Partial<BusinessHours[DayOfWeek]>) {
    onChange({
      hoursPreset: 'personalizado',
      businessHours: {
        ...data.businessHours,
        [day]: { ...data.businessHours[day], ...patch },
      },
    })
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Quando vocês atendem?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pode ajustar tudo depois nas configurações.
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
          borderColor: data.skipHours ? 'success.main' : 'border.subtle',
          bgcolor: data.skipHours ? 'success.soft' : 'surface.paper',
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Preencher depois
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Você pode definir os horários nas configurações do estabelecimento.
          </Typography>
        </Box>
        <Switch
          checked={data.skipHours}
          onChange={(_, checked) => onChange({ skipHours: checked })}
        />
      </Paper>

      <Collapse in={!data.skipHours}>
        {/* Preset cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 1.5,
          mb: 3,
        }}
      >
        {PRESETS.map(({ value, label, description }) => {
          const selected = data.hoursPreset === value
          return (
            <Box
              key={value}
              onClick={() => handlePresetSelect(value)}
              sx={{
                position: 'relative',
                border: 2,
                borderColor: selected ? 'success.main' : 'border.subtle',
                borderRadius: 1,
                p: 1.5,
                cursor: 'pointer',
                bgcolor: selected ? 'success.soft' : 'surface.paper',
                transition: 'all 0.15s',
                '&:hover': {
                  borderColor: selected ? 'success.main' : 'border.strong',
                },
              }}
            >
              {selected && (
                <CheckCircleIcon
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: 16,
                    color: 'success.main',
                  }}
                />
              )}
              <Typography
                variant="body2"
                color={selected ? 'success.ink' : 'text.primary'}
                sx={{ fontWeight: 700, mb: 0.25 }}
              >
                {label}
              </Typography>
              <Typography
                variant="caption"
                color={selected ? 'success.ink' : 'text.secondary'}
                sx={{ opacity: selected ? 0.8 : 1 }}
              >
                {description}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Info banner */}
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          mb: 2,
          borderRadius: 2,
          borderColor: 'border.subtle',
          bgcolor: 'surface.sunken',
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary">
          Ajuste dia a dia se precisar
        </Typography>
      </Paper>

      {/* Tabela de dias */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {DAYS.map(({ key, label }) => {
          const day = data.businessHours[key]
          return (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                py: 1,
                px: 1.5,
                borderRadius: 1.5,
                bgcolor: day.open ? 'surface.paper' : 'surface.sunken',
                border: 1,
                borderColor: 'border.subtle',
              }}
            >
              <Switch
                size="small"
                checked={day.open}
                onChange={(_, checked) => patchDay(key, { open: checked })}
              />
              <Typography
                variant="body2"
                color={day.open ? 'text.primary' : 'text.disabled'}
                sx={{ fontWeight: 500, width: 64, flexShrink: 0 }}
              >
                {label}
              </Typography>
              <TextField
                type="time"
                size="small"
                value={day.openTime}
                onChange={(e) => patchDay(key, { openTime: e.target.value })}
                disabled={!day.open}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { step: 60 } }}
              />
              <Typography variant="body2" color="text.disabled" sx={{ flexShrink: 0 }}>
                até
              </Typography>
              <TextField
                type="time"
                size="small"
                value={day.closeTime}
                onChange={(e) => patchDay(key, { closeTime: e.target.value })}
                disabled={!day.open}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { step: 60 } }}
              />
              <Typography
                variant="caption"
                color={day.open ? 'success.main' : 'text.disabled'}
                sx={{ fontWeight: 500, ml: 'auto', flexShrink: 0 }}
              >
                {day.open ? 'Aberto' : 'Fechado'}
              </Typography>
            </Box>
          )
        })}
      </Box>
      </Collapse>
    </Box>
  )
}
