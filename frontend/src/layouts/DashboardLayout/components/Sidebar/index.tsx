import { Box, Drawer } from '@mui/material'
import { useLocation } from 'react-router-dom'
import BrandHeader from '../BrandHeader'
import StoreSelector from '../StoreSelector'
import SidebarNav from '../SidebarNav'
import PremiumBanner from '../PremiumBanner'
import { ADMIN_NAV_SECTIONS, DRAWER_WIDTH, NAV_SECTIONS } from '../../constants'
import { SidebarProps } from './types'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import { useAppSelector } from '../../../../store'

export default function Sidebar({ isMobile, mobileOpen, onClose }: SidebarProps) {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  const role = useAppSelector((s) => s.auth.role)
  const { pathname } = useLocation()

  const isAdminArea = role === 'Admin' && pathname.startsWith('/admin')

  const visibleSections = isAdminArea
    ? ADMIN_NAV_SECTIONS
    : NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            (!item.module || isModuleEnabled(item.module)) &&
            (!item.requiredPermission || hasPermission(item.requiredPermission)),
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
