import { Box, IconButton } from '@mui/material'
import { SettingsOutlined, MenuRounded } from '@mui/icons-material'
import Breadcrumbs from '../Breadcrumbs'
import UserMenu from '../UserMenu'
import { TOPBAR_HEIGHT } from '../../constants'
import { TopBarProps } from './types'

export default function TopBar({ isMobile, onMenuClick }: TopBarProps) {
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
        <Breadcrumbs />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
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
          <SettingsOutlined sx={{ fontSize: 18 }} />
        </IconButton>
        <UserMenu />
      </Box>
    </Box>
  )
}
