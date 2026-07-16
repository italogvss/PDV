import { Box, Typography } from '@mui/material'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavSection } from '../../../../layouts/DashboardLayout/constants'

// Nav do admin. Igual em estilo ao SidebarNav de loja, mas com match EXATO por rota — as rotas de
// admin são planas (sem detalhes aninhados nesta fase), então "Visão geral" (/admin) não deve
// acender nas subpáginas (/admin/assinaturas etc.), o que o startsWith do SidebarNav faria.
export default function AdminSidebarNav({ sections }: { sections: NavSection[] }) {
  const { pathname } = useLocation()

  return (
    <Box
      component="nav"
      sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2,
        py: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {sections.flatMap((section) => section.items).map((item) => {
        const Icon = item.icon
        const active = pathname === item.path
        return (
          <Box
            key={item.path}
            component={NavLink}
            to={item.path}
            end
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.25,
              borderRadius: 2,
              textDecoration: 'none',
              color: active ? 'text.primary' : 'text.secondary',
              bgcolor: active ? 'background.paper' : 'transparent',
              boxShadow: active ? (theme) => theme.customShadows.xs : 'none',
              border: 1,
              borderColor: active ? 'border.subtle' : 'transparent',
              fontWeight: active ? 600 : 500,
              transition: 'background-color 0.15s, color 0.15s',
              '&:hover': {
                bgcolor: active ? 'background.paper' : 'surface.raised',
                color: 'text.primary',
              },
            }}
          >
            <Icon sx={{ fontSize: 18, color: active ? 'text.primary' : 'text.tertiary' }} />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 'inherit', color: 'inherit' }}>
              {item.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
