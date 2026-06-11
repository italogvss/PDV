import { useEffect, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Slider, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import SettingCard from '../../../../components/SettingCard'
import { useThemeMode } from '../../../../context/ThemeModeContext'
import {
  useUpdateAppearanceSettings,
  useUserSettings,
} from '../../../../hooks/useUserSettings'
import type { AccentColor, AppearancePrefs, AppTheme } from '../../../../types/usersettings.type'
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN } from '../../../../types/usersettings.type'
import { ACCENT_COLORS } from '../../types'



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
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {selected && <CheckIcon sx={{ fontSize: 16, color: 'secondary.main' }} />}
      </Box>
    </Box>
  )
}

export default function AppearanceSection() {
  const { data, isLoading } = useUserSettings()
  const update = useUpdateAppearanceSettings()
  const { setPreview, resetPreview } = useThemeMode()
  const [form, setForm] = useState<AppearancePrefs | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setForm(data.appearance)
      initialized.current = true
    }
  }, [data])

  // Ao sair da seção sem salvar, descarta o preview ao vivo.
  useEffect(() => () => resetPreview(), [resetPreview])

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const setTheme = (theme: AppTheme) => {
    setForm((f) => (f ? { ...f, theme } : f))
    setPreview({ mode: theme })
  }
  const setAccent = (accentColor: AccentColor) => setForm((f) => (f ? { ...f, accentColor } : f))
  const setTextSize = (textSize: number) => {
    setForm((f) => (f ? { ...f, textSize } : f))
    setPreview({ textSize })
  }

  const hasChanges =
    !!data &&
    (form.theme !== data.appearance.theme ||
      form.accentColor !== data.appearance.accentColor ||
      form.textSize !== data.appearance.textSize)

  const handleSave = () => {
    if (form) update.mutate(form)
  }

  const handleCancel = () => {
    if (data) setForm(data.appearance)
    resetPreview()
  }

  const saveAction = hasChanges ? (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Button variant="outlined" size="small" onClick={handleCancel} disabled={update.isPending}>
        Cancelar
      </Button>
      <Button
        variant="contained"
        size="small"
        color="secondary"
        startIcon={update.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
        onClick={handleSave}
        disabled={update.isPending}
      >
        Salvar alterações
      </Button>
    </Box>
  ) : undefined

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Tema" action={saveAction}>
        <Box sx={{ display: 'flex', gap: 2, p: 3 }}>
          <ThemeCard
            label="Claro"
            selected={form.theme === 'light'}
            onClick={() => setTheme('light')}
            preview="light"
          />
          <ThemeCard
            label="Escuro"
            selected={form.theme === 'dark'}
            onClick={() => setTheme('dark')}
            preview="dark"
          />
        </Box>
      </SettingCard>

      <SettingCard title="Cor de destaque" subtitle="Aplicada em botões, gráficos e indicadores">
        <Box sx={{ px: 4, py: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {ACCENT_COLORS.map((color) => {
            const selected = form.accentColor === color.id
            return (
              <Box
                key={color.id}
                onClick={() => setAccent(color.id)}
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
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {color.label}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </SettingCard>

      <SettingCard
        title="Tamanho do texto"
        subtitle="Ajusta o tamanho base do texto em todo o sistema"
      >
        <Box sx={{ px: 4, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: 1,
              borderColor: 'border.subtle',
              bgcolor: 'surface.sunken',
            }}
          >
            <Typography sx={{ fontSize: form.textSize, lineHeight: 1.5, color: 'text.primary' }}>
              <i>"Se você não consegue amar a si mesmo, como infernos vai amar outra pessoa?"</i> - RuPaul.
            </Typography>
            <Typography
              sx={{ fontSize: form.textSize * 0.8, color: 'text.tertiary', mt: 0.5 }}
            >
              Exemplo de texto secundário · {form.textSize}px
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 1 }}>
            <Typography sx={{ fontSize: 13, color: 'text.tertiary' }}>A</Typography>
            <Slider
              value={form.textSize}
              min={TEXT_SIZE_MIN}
              max={TEXT_SIZE_MAX}
              step={1}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}px`}
              onChange={(_, value) => setTextSize(value as number)}
              sx={{ flex: 1 }}
            />
            <Typography sx={{ fontSize: 22, color: 'text.tertiary' }}>A</Typography>
          </Box>
        </Box>
      </SettingCard>
    </Box>
  )
}
