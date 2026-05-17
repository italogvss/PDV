import { Box, Typography, Chip } from '@mui/material'
import { NavLink, useLocation } from 'react-router-dom'
import { SidebarNavProps } from './types'

export default function SidebarNav({ sections }: SidebarNavProps) {
  const { pathname } = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(`${path}/`)
  }

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
      {sections.map((section) => (
        <Box key={section.title} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            variant="overline"
            color="text.tertiary"
            sx={{ px: 2, pt: 2, pb: 1, fontSize: 11 }}
          >
            {section.title}
          </Typography>
          {section.items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Box
                key={item.path}
                component={NavLink}
                to={item.path}
                end={item.path === '/'}
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
                <Icon
                  sx={{
                    fontSize: 18,
                    color: active ? 'text.primary' : 'text.tertiary',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ flex: 1, fontWeight: 'inherit', color: 'inherit' }}
                >
                  {item.label}
                </Typography>
                {item.badge && (
                  <Chip
                    label={item.badge.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      px: 0.5,
                      ...(item.badge.tone === 'new'
                        ? {
                            bgcolor: 'success.soft',
                            color: 'success.ink',
                          }
                        : {
                            bgcolor: 'surface.raised',
                            color: 'text.secondary',
                          }),
                    }}
                  />
                )}
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
