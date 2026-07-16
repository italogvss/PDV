import { useEffect, useState } from 'react'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './components/AdminSidebar'
import AdminTopBar from './components/AdminTopBar'

// Shell da área de administração — mesma proporção do DashboardLayout de loja, porém limpo: sem
// StoreSelector, banners de assinatura, overlay de exclusão ou painéis de dev. O acesso é decidido
// pelo RouterGuard type="admin".
export default function AdminLayout() {
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
      <AdminSidebar isMobile={isMobile} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <AdminTopBar isMobile={isMobile} onMenuClick={() => setMobileOpen(true)} />
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
