import { Box, IconButton, Typography } from '@mui/material'
import { DarkModeOutlined, LightModeOutlined, MenuRounded } from '@mui/icons-material'
import { TOPBAR_HEIGHT } from '../../constants'
import AdminUserMenu from '../AdminUserMenu'
import { useThemeMode } from '../../../../context/ThemeModeContext'
import { useUpdateAppearanceSettings, useUserSettings } from '../../../../hooks/useUserSettings'

interface AdminTopBarProps {
  isMobile: boolean
  onMenuClick: () => void
}

export default function AdminTopBar({ isMobile, onMenuClick }: AdminTopBarProps) {
  const { mode } = useThemeMode()
  const { data: settings } = useUserSettings()
  const updateAppearance = useUpdateAppearanceSettings()

  function handleToggleTheme() {
    if (!settings) return
    updateAppearance.mutate({ ...settings.appearance, theme: mode === 'dark' ? 'light' : 'dark' })
  }

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        height: TOPBAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 3, md: 4 },
        gap: 2,
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'border.subtle',
      }}
    >
      {isMobile ? (
        <IconButton
          onClick={onMenuClick}
          size="small"
          sx={{
            color: 'text.primary',
            border: 1,
            borderColor: 'border.subtle',
            borderRadius: 2,
            bgcolor: 'background.paper',
            width: 36,
            height: 36,
          }}
        >
          <MenuRounded sx={{ fontSize: 20 }} />
        </IconButton>
      ) : (
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Administração da plataforma
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          onClick={handleToggleTheme}
          disabled={!settings || updateAppearance.isPending}
          size="small"
          sx={{
            color: 'text.tertiary',
            border: 1,
            borderColor: 'border.subtle',
            borderRadius: 2,
            bgcolor: 'background.paper',
            width: 36,
            height: 36,
          }}
        >
          {mode === 'dark' ? <LightModeOutlined sx={{ fontSize: 18 }} /> : <DarkModeOutlined sx={{ fontSize: 18 }} />}
        </IconButton>
        <AdminUserMenu />
      </Box>
    </Box>
  )
}
