import { Box, Typography, Avatar, Divider, Chip } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import InventoryIcon from '@mui/icons-material/Inventory'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BadgeIcon from '@mui/icons-material/Badge'
import CheckIcon from '@mui/icons-material/Check'
import type { DayOfWeek } from '../../../types/settings.types'
import type { CreateTenantFormData } from '../types'

interface PreviewPanelProps {
  data: CreateTenantFormData
  step: number
}

const STEP_LABELS = ['Seu negócio', 'Documentos', 'Endereço', 'Horário']

function formatHours(data: CreateTenantFormData): string {
  const { businessHours } = data
  const openDays = (Object.entries(businessHours) as [DayOfWeek, typeof businessHours[DayOfWeek]][])
    .filter(([, d]) => d.open)
  if (openDays.length === 0) return 'Fechado todos os dias'
  if (openDays.length === 7) {
    const first = openDays[0][1]
    return `Todos os dias ${first.openTime}h-${first.closeTime}h`
  }
  const weekdays = openDays.filter(([k]) => !['saturday', 'sunday'].includes(k))
  const saturday = businessHours.saturday
  const parts: string[] = []
  if (weekdays.length > 0) {
    const wh = weekdays[0][1]
    parts.push(`Seg-Sex ${wh.openTime}h-${wh.closeTime}h`)
  }
  if (saturday.open) {
    parts.push(`Sáb ${saturday.openTime}h-${saturday.closeTime}h`)
  }
  return parts.join(', ')
}

function formatAddress(data: CreateTenantFormData): string {
  if (!data.street) return ''
  const parts = [data.street, data.number].filter(Boolean).join(', ')
  const cityState = [data.city, data.state].filter(Boolean).join(' - ')
  return [parts, cityState].filter(Boolean).join('\n')
}

export default function PreviewPanel({ data, step }: PreviewPanelProps) {
  const initial = data.fantasyName.charAt(0).toUpperCase() || 'N'
  const displayName = data.fantasyName || 'Seu negócio'
  const cnpjDisplay = data.skipDocuments
    ? 'CNPJ pendente'
    : data.cnpj
      ? `CNPJ: ${data.cnpj}`
      : 'CNPJ pendente'
  const addressDisplay = formatAddress(data) || 'Endereço pendente'
  const hoursDisplay = formatHours(data)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ fontSize: '0.65rem', letterSpacing: 1.5 }}
      >
        Como vai aparecer
      </Typography>

      {/* App branding */}
      <Box
        sx={{
          border: 1,
          borderColor: 'border.subtle',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'surface.paper',
        }}
      >
        {/* App header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: 1,
            borderColor: 'border.subtle',
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.85rem',
            }}
          >
            P
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            PDV Ultra
          </Typography>
        </Box>

        {/* Business card */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={data.logoPreview ?? undefined}
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'surface.raised',
              color: 'text.secondary',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {!data.logoPreview && initial}
          </Avatar>
          <Box>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: 150 }}>
              {displayName}
            </Typography>
            <Chip
              label="Plano grátis"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: 'surface.raised',
                color: 'text.secondary',
              }}
            />
          </Box>
        </Box>

        {/* Fake nav */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: 1,
            borderColor: 'border.subtle',
            bgcolor: 'surface.sunken',
          }}
        >
          {[
            { icon: <DashboardIcon sx={{ fontSize: 14 }} />, label: 'Dashboard' },
            { icon: <ShoppingCartIcon sx={{ fontSize: 14 }} />, label: 'PDV — Vendas' },
            { icon: <InventoryIcon sx={{ fontSize: 14 }} />, label: 'Estoque' },
          ].map(({ icon, label }) => (
            <Box
              key={label}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}
            >
              <Box sx={{ color: 'text.disabled' }}>{icon}</Box>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Business detail card */}
      <Box
        sx={{
          border: 1,
          borderColor: 'border.subtle',
          borderRadius: 2,
          bgcolor: 'surface.paper',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={data.logoPreview ?? undefined}
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'surface.raised',
              color: 'text.secondary',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {!data.logoPreview && initial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.disabled" noWrap>
              {cnpjDisplay}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.1 }} />
            <Typography variant="caption" color="text.secondary">
              {hoursDisplay}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <LocationOnIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.1 }} />
            <Typography
              variant="caption"
              color={data.street ? 'text.secondary' : 'text.disabled'}
              sx={{ whiteSpace: 'pre-line' }}
            >
              {addressDisplay}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BadgeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              Cupom #001 · passo {step} de 4
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Step progress */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {STEP_LABELS.map((label, i) => {
          const num = i + 1
          const isCompleted = num < step
          const isCurrent = num === step
          return (
            <Box
              key={num}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                bgcolor: isCurrent ? 'success.soft' : 'transparent',
              }}
            >
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isCompleted
                    ? 'success.main'
                    : isCurrent
                      ? 'success.soft'
                      : 'surface.raised',
                  color: isCompleted ? '#fff' : isCurrent ? 'success.main' : 'text.disabled',
                  border: isCurrent ? 2 : 0,
                  borderColor: 'success.main',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {isCompleted ? <CheckIcon sx={{ fontSize: 10 }} /> : num}
              </Box>
              <Typography
                variant="caption"
                color={isCurrent ? 'success.ink' : isCompleted ? 'text.secondary' : 'text.disabled'}
                sx={{ fontWeight: isCurrent || isCompleted ? 600 : 400 }}
              >
                {label}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
