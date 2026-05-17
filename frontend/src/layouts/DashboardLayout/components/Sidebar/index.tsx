import { Box, Drawer } from '@mui/material'
import BrandHeader from '../BrandHeader'
import StoreSelector from '../StoreSelector'
import SidebarNav from '../SidebarNav'
import PremiumBanner from '../PremiumBanner'
import { DRAWER_WIDTH, NAV_SECTIONS } from '../../constants'
import { SidebarProps } from './types'

export default function Sidebar({ isMobile, mobileOpen, onClose }: SidebarProps) {
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
        <SidebarNav sections={NAV_SECTIONS} />
        <PremiumBanner />
      </Box>
    </Drawer>
  )
}
