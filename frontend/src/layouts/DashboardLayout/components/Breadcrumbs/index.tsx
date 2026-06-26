import { Box, Typography, IconButton } from '@mui/material'
import { ArrowOutwardOutlined } from '@mui/icons-material'
import { Link, useLocation } from 'react-router-dom'
import { NAV_SECTIONS } from '../../constants'
import { useCustomer } from '../../../../hooks/useCustomers'
import { useAppSelector } from '../../../../store'

function resolvePageLabel(pathname: string) {
  const item = NAV_SECTIONS.flatMap((s) => s.items).find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  )
  return item?.label ?? 'Dashboard'
}

function CustomerBreadcrumb({ id, storeName }: { id: string; storeName: string }) {
  const { data: customer } = useCustomer(id)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton size="small" sx={{ color: 'text.tertiary' }}>
        <ArrowOutwardOutlined sx={{ fontSize: 16 }} />
      </IconButton>
      <Typography variant="body2" color="text.secondary">
        {storeName}
      </Typography>
      <Typography variant="body2" color="text.tertiary">/</Typography>
      <Link to="/clientes" style={{ textDecoration: 'none' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
        >
          Clientes
        </Typography>
      </Link>
      <Typography variant="body2" color="text.tertiary">/</Typography>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
        {customer?.name ?? '...'}
      </Typography>
    </Box>
  )
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const { tenantId, tenants } = useAppSelector((s) => s.auth)
  const storeName = tenants.find((t) => t.tenantId === tenantId)?.name ?? 'Loja'

  const customerMatch = pathname.match(/^\/clientes\/([^/]+)$/)
  if (customerMatch) return <CustomerBreadcrumb id={customerMatch[1]} storeName={storeName} />

  const page = resolvePageLabel(pathname)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton size="small" sx={{ color: 'text.tertiary' }}>
        <ArrowOutwardOutlined sx={{ fontSize: 16 }} />
      </IconButton>
      <Typography variant="body2" color="text.secondary">
        {storeName}
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
