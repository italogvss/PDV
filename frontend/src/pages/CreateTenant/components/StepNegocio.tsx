import { useRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Avatar,
  InputAdornment,
  IconButton,
} from '@mui/material'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import LocalCafeIcon from '@mui/icons-material/LocalCafe'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'
import StoreIcon from '@mui/icons-material/Store'
import HandymanIcon from '@mui/icons-material/Handyman'
import GridViewIcon from '@mui/icons-material/GridView'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PhoneIcon from '@mui/icons-material/Phone'
import type { BusinessSegment } from '../../../types/settings.types'
import type { CreateTenantFormData, FormErrors } from '../types'
import { formatPhone } from '../../../utils/masks'

interface StepNegocioProps {
  data: CreateTenantFormData
  onChange: (patch: Partial<CreateTenantFormData>) => void
  errors: FormErrors
}

const SEGMENTS: { value: BusinessSegment; label: string; Icon: React.ElementType }[] = [
  { value: 'cafeteria',   label: 'Cafeteria / Padaria',   Icon: LocalCafeIcon },
  { value: 'restaurante', label: 'Restaurante / Bar',      Icon: RestaurantIcon },
  { value: 'mercado',     label: 'Mercado / Mercearia',    Icon: ShoppingBasketIcon },
  { value: 'varejo',      label: 'Varejo / Loja',          Icon: StoreIcon },
  { value: 'servicos',    label: 'Serviços',               Icon: HandymanIcon },
  { value: 'outro',       label: 'Outro segmento',         Icon: GridViewIcon },
]


export default function StepNegocio({ data, onChange, errors }: StepNegocioProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleLogoClick() {
    fileInputRef.current?.click()
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange({ logoPreview: ev.target?.result as string, logoFile: file })
    }
    reader.readAsDataURL(file)
  }

  const initial = data.fantasyName.charAt(0).toUpperCase() || 'N'

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Como se chama o seu negócio?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        É o nome que vai aparecer no PDV Ultra e nos recibos.
      </Typography>

      {/* Logo upload */}
      <Box
        sx={{
          border: 1,
          borderColor: 'border.subtle',
          borderRadius: 2,
          p: 2.5,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Avatar
            src={data.logoPreview ?? undefined}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'surface.raised',
              color: 'text.secondary',
              fontSize: '1.5rem',
              fontWeight: 700,
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }}
            onClick={handleLogoClick}
          >
            {!data.logoPreview && initial}
          </Avatar>
          <IconButton
            size="small"
            onClick={handleLogoClick}
            sx={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              bgcolor: 'surface.paper',
              border: 1,
              borderColor: 'border.subtle',
              width: 22,
              height: 22,
              '&:hover': { bgcolor: 'surface.raised' },
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: 13 }} />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Logo do estabelecimento
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PNG ou SVG até 1MB. Você pode adicionar depois.
          </Typography>
          <Box
            component="button"
            onClick={handleLogoClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'text.secondary',
              fontSize: '0.75rem',
              p: 0,
              '&:hover': { color: 'text.primary' },
            }}
          >
            ↑ Enviar imagem
          </Box>
        </Box>
      </Box>

      {/* Nome fantasia + telefone */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField
          label="Nome fantasia"
          required
          fullWidth
          value={data.fantasyName}
          onChange={(e) => onChange({ fantasyName: e.target.value })}
          error={!!errors.fantasyName}
          helperText={errors.fantasyName}
          placeholder="Ex: Café da Esquina"
        />
        <TextField
          label="Telefone público"
          fullWidth
          value={data.phone}
          onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
          placeholder="(11) 99999-9999"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
            inputLabel: {
              shrink: true,
            },
          }}
          helperText="opcional"
        />
      </Box>

      {/* Segmento */}
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Segmento *
        {errors.segment && (
          <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
            {errors.segment}
          </Typography>
        )}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
          gap: 1.5,
        }}
      >
        {SEGMENTS.map(({ value, label, Icon }) => {
          const selected = data.segment === value
          return (
            <Box
              key={value}
              onClick={() => onChange({ segment: value })}
              sx={{
                position: 'relative',
                border: 2,
                borderColor: selected ? 'success.main' : errors.segment ? 'error.main' : 'border.subtle',
                borderRadius: 1,
                p: 2,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                bgcolor: selected ? 'success.soft' : 'surface.paper',
                transition: 'all 0.15s',
                '&:hover': {
                  borderColor: selected ? 'success.main' : 'border.strong',
                  bgcolor: selected ? 'success.soft' : 'surface.raised',
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
              <Icon sx={{ fontSize: 22, color: selected ? 'success.ink' : 'text.secondary' }} />
              <Typography
                variant="body2"
                color={selected ? 'success.ink' : 'text.primary'}
                sx={{ fontWeight: selected ? 500 : 400, lineHeight: 1.3 }}
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
