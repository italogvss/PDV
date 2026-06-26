import { Box, Card, CardActionArea, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import { NAV_SECTIONS } from '../../../../layouts/DashboardLayout/constants'

const EXCLUDED_PATHS = ['/', '/configuracoes', '/ajuda', '/assinatura/retorno']

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { hasPermission, isModuleEnabled } = useUserPermissions()

  const modules = NAV_SECTIONS.flatMap((s) => s.items).filter(
    (item) =>
      !EXCLUDED_PATHS.includes(item.path) &&
      (!item.module || isModuleEnabled(item.module)) &&
      (!item.requiredPermission || hasPermission(item.requiredPermission)),
  )

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
      }}
    >
      {modules.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.path} variant="outlined">
            <CardActionArea
              onClick={() => navigate(item.path)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                py: 4,
                px: 2,
              }}
            >
              <Icon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="h6" component="h2" textAlign="center" fontWeight={600}>
                {item.label}
              </Typography>
            </CardActionArea>
          </Card>
        )
      })}
    </Box>
  )
}
