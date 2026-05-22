import { useState } from 'react'
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

type ThemeOption = 'light' | 'dark' | 'auto'

const ACCENT_COLORS = [
  { id: 'green', label: 'Verde', hex: '#2fa040' },
  { id: 'blue', label: 'Azul', hex: '#3a82d4' },
  { id: 'orange', label: 'Laranja', hex: '#d97a1f' },
  { id: 'purple', label: 'Roxo', hex: '#9152d4' },
  { id: 'pink', label: 'Rosa', hex: '#d94576' },
  { id: 'graphite', label: 'Grafite', hex: '#4b4b4b' },
]

function ThemeCard({
  label,
  selected,
  onClick,
  preview,
}: {
  label: string
  selected: boolean
  onClick: () => void
  preview: 'light' | 'dark' | 'split'
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        borderRadius: 2,
        border: 2,
        borderColor: selected ? 'secondary.main' : 'border.subtle',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: selected ? 'secondary.main' : 'border.strong' },
      }}
    >
      <Box
        sx={{
          height: 72,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {preview === 'split' ? (
          <>
            <Box sx={{ flex: 1, bgcolor: '#f4f3ef' }} />
            <Box sx={{ flex: 1, bgcolor: '#1a1a1a' }} />
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              bgcolor: preview === 'dark' ? '#1a1a1a' : '#f4f3ef',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              p: 1.5,
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                height: 6,
                borderRadius: 1,
                bgcolor: preview === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                width: '60%',
              }}
            />
            <Box
              sx={{
                height: 6,
                borderRadius: 1,
                bgcolor: preview === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                width: '40%',
              }}
            />
          </Box>
        )}
      </Box>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" fontWeight={500} color="text.primary">
          {label}
        </Typography>
        {selected && <CheckIcon sx={{ fontSize: 16, color: 'secondary.main' }} />}
      </Box>
    </Box>
  )
}

export default function AppearanceSection() {
  const [theme, setTheme] = useState<ThemeOption>('light')
  const [accentColor, setAccentColor] = useState('green')
  const [density, setDensity] = useState('comfortable')
  const [language, setLanguage] = useState('pt-BR')
  const [currencyFormat, setCurrencyFormat] = useState('brl')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Tema">
        <Box sx={{ display: 'flex', gap: 2, p: 3 }}>
          <ThemeCard
            label="Claro"
            selected={theme === 'light'}
            onClick={() => setTheme('light')}
            preview="light"
          />
          <ThemeCard
            label="Escuro"
            selected={theme === 'dark'}
            onClick={() => setTheme('dark')}
            preview="dark"
          />
          <ThemeCard
            label="Automático"
            selected={theme === 'auto'}
            onClick={() => setTheme('auto')}
            preview="split"
          />
        </Box>
      </SettingCard>

      <SettingCard title="Cor de destaque" subtitle="Aplicada em botões, gráficos e indicadores">
        <Box sx={{ px: 4, py: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {ACCENT_COLORS.map((color) => {
            const selected = accentColor === color.id
            return (
              <Box
                key={color.id}
                onClick={() => setAccentColor(color.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 5,
                  border: 2,
                  borderColor: selected ? color.hex : 'transparent',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  '&:hover': { bgcolor: 'surface.raised' },
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: color.hex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && <CheckIcon sx={{ fontSize: 12, color: '#fff' }} />}
                </Box>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {color.label}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </SettingCard>

      <SettingCard title="Densidade">
        <SettingRow label="Espaçamento das listas" sublabel="Compacto mostra mais linhas por tela">
          <ToggleButtonGroup
            value={density}
            exclusive
            onChange={(_, v) => v && setDensity(v)}
            size="small"
          >
            <ToggleButton value="compact">Compacto</ToggleButton>
            <ToggleButton value="comfortable">Confortável</ToggleButton>
          </ToggleButtonGroup>
        </SettingRow>

        <SettingRow label="Idioma">
          <FormControl size="small" sx={{ width: 220 }}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
              <MenuItem value="en-US">English (US)</MenuItem>
              <MenuItem value="es">Español</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="Formato de moeda">
          <FormControl size="small" sx={{ width: 220 }}>
            <Select value={currencyFormat} onChange={(e) => setCurrencyFormat(e.target.value)}>
              <MenuItem value="brl">R$ 1.234,56</MenuItem>
              <MenuItem value="usd">$ 1,234.56</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
