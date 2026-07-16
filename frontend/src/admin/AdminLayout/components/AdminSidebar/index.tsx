import { Box, Chip, Drawer } from '@mui/material'
import BrandHeader from '../../../../layouts/DashboardLayout/components/BrandHeader'
import AdminSidebarNav from '../AdminSidebarNav'
import { ADMIN_NAV_SECTIONS, DRAWER_WIDTH } from '../../constants'

interface AdminSidebarProps {
  isMobile: boolean
  mobileOpen: boolean
  onClose: () => void
}

export default function AdminSidebar({ isMobile, mobileOpen, onClose }: AdminSidebarProps) {
  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isMobile ? 0 : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'border.subtle',
          bgcolor: 'surface.sunken',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {!isMobile && <BrandHeader />}
        {/* Selo que deixa claro que é a área de plataforma, não o app de loja. */}
        <Box sx={{ px: 3, pb: 1 }}>
          <Chip
            label="Administração"
            size="small"
            sx={{
              height: 22,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              bgcolor: 'surface.raised',
              color: 'text.secondary',
            }}
          />
        </Box>
        <AdminSidebarNav sections={ADMIN_NAV_SECTIONS} />
      </Box>
    </Drawer>
  )
}
