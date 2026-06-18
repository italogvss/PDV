import { useState, type MouseEvent } from 'react'
import { Box, Avatar, Typography } from '@mui/material'
import { KeyboardArrowDown } from '@mui/icons-material'
import { useAppSelector } from '../../../../store'
import Dropdown from './components/Dropdown'

export default function UserMenu() {
  const auth = useAppSelector((state) => state.auth)
  const planLabel = auth.subscription?.planName ?? 'Gratuito'

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={handleOpen}
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
          sx={{
            width: 28,
            height: 28,
            fontSize: 11,
            fontWeight: 600,
            bgcolor: 'accent.600',
            color: 'common.white',
          }}
          src={auth.avatarUrl ?? undefined}
        >
          
        </Avatar>
        <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontWeight: 600, lineHeight: 1.1 }}
            noWrap
          >
            {auth.name}
          </Typography>
          <Typography variant="caption" color="text.tertiary" sx={{ fontSize: 11 }}>
            {planLabel}
          </Typography>
        </Box>
        <KeyboardArrowDown sx={{ fontSize: 16, color: 'text.tertiary' }} />
      </Box>
      <Dropdown anchorEl={anchorEl} open={open} onClose={handleClose} />
    </>
  )
}
