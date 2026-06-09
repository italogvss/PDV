import { useRef, useState } from 'react'
import { Box, Avatar, Typography, IconButton, Popover, CircularProgress } from '@mui/material'
import { UnfoldMore, Check } from '@mui/icons-material'
import { useAppSelector } from '../../../../store'
import { useSwitchTenant } from '../../../../hooks/useSwitchTenant'
import type { TenantListItem } from '../../../../types/tenant.types'

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function TenantRow({
  tenant,
  isActive,
  isLoading,
  onClick,
}: {
  tenant: TenantListItem
  isActive: boolean
  isLoading: boolean
  onClick: () => void
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: 1,
        cursor: isActive ? 'default' : 'pointer',
        bgcolor: isActive ? 'action.selected' : 'transparent',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: isActive ? 'action.selected' : 'surface.sunken' },
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          width: 28,
          height: 28,
          bgcolor: 'accent.600',
          color: 'common.white',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {getInitials(tenant.name)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ fontWeight: 600, lineHeight: 1.2 }}
          noWrap
        >
          {tenant.name}
        </Typography>
        <Typography variant="caption" color="text.tertiary">
          {tenant.role === 'Owner' ? 'Proprietário' : 'Funcionário'}
        </Typography>
      </Box>
      <Box sx={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLoading ? (
          <CircularProgress size={14} sx={{ color: 'text.tertiary' }} />
        ) : isActive ? (
          <Check sx={{ fontSize: 16, color: 'text.secondary' }} />
        ) : null}
      </Box>
    </Box>
  )
}

export default function StoreSelector() {
  const { tenantId, tenants } = useAppSelector((s) => s.auth)
  const switchTenant = useSwitchTenant()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const activeTenant = tenants.find((t) => t.tenantId === tenantId)
  const activeName = activeTenant?.name ?? ''
  const canSwitch = tenants.length > 1

  function handleOpen() {
    if (!canSwitch) return
    setAnchorEl(triggerRef.current)
  }

  function handleClose() {
    setAnchorEl(null)
  }

  function handleSwitch(id: string) {
    if (id === tenantId) return
    switchTenant.mutate(id, { onSettled: handleClose })
  }

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box
        ref={triggerRef}
        onClick={handleOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'border.subtle',
          bgcolor: 'background.paper',
          cursor: canSwitch ? 'pointer' : 'default',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: canSwitch ? 'surface.sunken' : 'background.paper' },
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 28,
            height: 28,
            bgcolor: 'accent.600',
            color: 'common.white',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {getInitials(activeName)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
            noWrap
          >
            {activeName}
          </Typography>
          <Typography variant="caption" color="text.tertiary">
            {activeTenant?.role === 'Owner' ? 'Proprietário' : 'Funcionário'}
          </Typography>
        </Box>
        {canSwitch && (
          <IconButton size="small" sx={{ color: 'text.tertiary' }} tabIndex={-1}>
            <UnfoldMore sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              p: 0.5,
              minWidth: triggerRef.current?.offsetWidth ?? 220,
              border: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              borderColor: 'border.subtle',
              boxShadow: 3,
            },
          },
        }}
      >
        {tenants.map((tenant) => (
          <TenantRow
            key={tenant.tenantId}
            tenant={tenant}
            isActive={tenant.tenantId === tenantId}
            isLoading={switchTenant.isPending && switchTenant.variables === tenant.tenantId}
            onClick={() => handleSwitch(tenant.tenantId)}
          />
        ))}
      </Popover>
    </Box>
  )
}
