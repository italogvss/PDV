import { Box, Typography, Button, Avatar, Chip, Paper, Divider, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from '../../../../store'
import { setTenant } from '../../../../store/slices/auth.slice'
import { useSwitchTenant } from '../../../../hooks/useSwitchTenant'

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export default function BusinessesSection() {
  const { tenants, tenantId } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const switchTenant = useSwitchTenant()

  function handleNewBusiness() {
    dispatch(setTenant({ tenantId: null }))
    queryClient.clear()
    navigate('/criar-negocio')
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Meus negócios
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Você pode gerenciar mais de um estabelecimento
          </Typography>
        </Box>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleNewBusiness}>
          Novo negócio
        </Button>
      </Box>
      <Divider />

      {tenants.map((tenant, idx) => (
        <Box key={tenant.tenantId}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'accent.600',
                  color: 'common.white',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 2,
                }}
              >
                {getInitials(tenant.name)}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                    {tenant.name}
                  </Typography>
                  {tenant.tenantId === tenantId && (
                    <Chip
                      label="Ativo"
                      size="small"
                      sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {tenant.role === 'Owner' ? 'Proprietário' : 'Funcionário'}
                </Typography>
              </Box>
            </Box>

            {tenant.tenantId !== tenantId && (
              <Button
                variant="outlined"
                disabled={switchTenant.isPending}
                onClick={() => switchTenant.mutate(tenant.tenantId)}
                endIcon={
                  switchTenant.isPending && switchTenant.variables === tenant.tenantId
                    ? <CircularProgress size={14} />
                    : undefined
                }
              >
                Acessar
              </Button>
            )}
          </Box>
          {idx < tenants.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  )
}
