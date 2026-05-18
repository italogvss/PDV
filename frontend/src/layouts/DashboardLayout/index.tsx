import { useEffect, useState } from 'react'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

export default function DashboardLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        height: { md: '100vh' },
        bgcolor: 'background.default',
      }}
    >
      <Sidebar
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <TopBar isMobile={isMobile} onMenuClick={() => setMobileOpen(true)} />
        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: { xs: 'visible', md: 'auto' },
            p: { xs: 4, md: 6 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
