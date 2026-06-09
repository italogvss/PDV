import { Box, Drawer } from '@mui/material'
import BrandHeader from '../BrandHeader'
import StoreSelector from '../StoreSelector'
import SidebarNav from '../SidebarNav'
import PremiumBanner from '../PremiumBanner'
import { DRAWER_WIDTH, NAV_SECTIONS } from '../../constants'
import { SidebarProps } from './types'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'

export default function Sidebar({ isMobile, mobileOpen, onClose }: SidebarProps) {
  const { hasPermission } = useUserPermissions()

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.requiredPermission || hasPermission(item.requiredPermission),
    ),
  }))

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
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!isMobile && <BrandHeader />}
        <StoreSelector />
        <SidebarNav sections={visibleSections} />
        <PremiumBanner />
      </Box>
    </Drawer>
  )
}
