import { useState, type MouseEvent } from 'react'
import { Avatar, Box, Divider, Menu, MenuItem, Typography } from '@mui/material'
import { KeyboardArrowDown, LogoutOutlined } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../../store'
import { clearAuth } from '../../../../store/slices/auth.slice'
import { clearStoredPlanSlug } from '../../../../utils/planSelection'

// Menu de usuário do admin — enxuto. Sem plano/lojas/configurações de loja: só identidade + logout.
export default function AdminUserMenu() {
  const auth = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const initials = (auth.name ?? 'Admin')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = () => {
    setAnchorEl(null)
    dispatch(clearAuth())
    clearStoredPlanSlug()
    navigate(import.meta.env.VITE_LANDING_URL)
  }

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pl: 1,
          pr: 1.5,
          py: 0.5,
          borderRadius: 2,
          border: 1,
          borderColor: open ? 'border.strong' : 'border.subtle',
          bgcolor: open ? 'surface.sunken' : 'background.paper',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: 'surface.sunken' },
        }}
      >
        <Avatar
          sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 600, bgcolor: 'accent.600', color: 'common.white' }}
          src={auth.avatarUrl ?? undefined}
        >
          {initials}
        </Avatar>
        <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, lineHeight: 1.1 }} noWrap>
            {auth.name}
          </Typography>
          <Typography variant="caption" color="text.tertiary" sx={{ fontSize: 11 }}>
            Administrador
          </Typography>
        </Box>
        <KeyboardArrowDown sx={{ fontSize: 16, color: 'text.tertiary' }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 260,
              borderRadius: 3,
              border: 1,
              borderColor: 'border.subtle',
              boxShadow: (theme) => theme.customShadows.lg,
            },
          },
          list: { disablePadding: true },
        }}
      >
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {auth.name}
          </Typography>
          <Typography variant="caption" color="text.tertiary" noWrap>
            {auth.email}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'border.subtle' }} />
        <Box sx={{ py: 1 }}>
          <MenuItem sx={{ gap: 2, py: 1.25, px: 2.5 }} onClick={handleLogout}>
            <LogoutOutlined sx={{ fontSize: 18, color: 'error.main' }} />
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500 }}>
              Sair da conta
            </Typography>
          </MenuItem>
        </Box>
      </Menu>
    </>
  )
}
