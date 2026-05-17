import { Box, Typography, IconButton } from '@mui/material'
import { ArrowOutwardOutlined } from '@mui/icons-material'
import { useLocation } from 'react-router-dom'
import { NAV_SECTIONS } from '../../constants'

function resolvePageLabel(pathname: string) {
  const item = NAV_SECTIONS.flatMap((s) => s.items).find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  )
  return item?.label ?? 'Dashboard'
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const page = resolvePageLabel(pathname)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton size="small" sx={{ color: 'text.tertiary' }}>
        <ArrowOutwardOutlined sx={{ fontSize: 16 }} />
      </IconButton>
      <Typography variant="body2" color="text.secondary">
        Café da Esquina
      </Typography>
      <Typography variant="body2" color="text.tertiary">
        /
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
        {page}
      </Typography>
    </Box>
  )
}
