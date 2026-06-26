import { useState } from 'react'
import {
  AddBusiness,
  BlockOutlined,
  DeleteForeverOutlined,
  EventBusyOutlined,
  FileDownloadOutlined,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from '../../../../store'
import { setTenant } from '../../../../store/slices/auth.slice'
import { useSwitchTenant } from '../../../../hooks/useSwitchTenant'
import { useDeactivateTenant } from '../../../../hooks/useDeactivateTenant'
import { useTenantSettings } from '../../../../hooks/useTenantSettings'
import { reportService } from '../../../../services/report.service'
import { useToast } from '../../../../hooks/useToast'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import ConfirmPhraseDialog from '../../../../components/ConfirmPhraseDialog'
import { EXPORT_CATEGORIES } from '../../types'
import type { TenantListItem } from '../../../../types/tenant.types'

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ExportMenu({ tenant }: { tenant: TenantListItem }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const showToast = useToast()

  async function handleExport(categoryId: string) {
    if (loadingId) return
    setLoadingId(categoryId)
    setAnchor(null)
    try {
      await reportService.exportCsvForTenant(tenant.tenantId, categoryId)
    } catch {
      showToast('Erro ao exportar dados. Tente novamente.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <Tooltip title="Exportar dados">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          disabled={!!loadingId}
          sx={{ color: 'error.main' }}
        >
          {loadingId ? <CircularProgress size={18} color="error" /> : <FileDownloadOutlined fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        {EXPORT_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <MenuItem key={cat.id} onClick={() => handleExport(cat.id)}>
              <Icon sx={{ fontSize: 18, mr: 1.5, color: 'text.secondary' }} />
              {cat.label}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default function BusinessesSection() {
  const { tenants, tenantId, role } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const switchTenant = useSwitchTenant()
  const deactivate = useDeactivateTenant()
  const { data: settings } = useTenantSettings()
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const activeTenants = tenants.filter((t) => t.isActive)
  const inactiveTenants = tenants.filter((t) => !t.isActive)
  const canDeactivate = activeTenants.length > 1
  const isOwner = role === 'Owner' || role === 'Admin'
  const currentTenantName = settings?.business.fantasyName ?? ''

  function handleNewBusiness() {
    dispatch(setTenant({ tenantId: null }))
    queryClient.clear()
    navigate('/criar-negocio')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Lojas ativas */}
      <SettingCard
        title="Meus negócios"
        subtitle="Você pode gerenciar mais de um estabelecimento"
        action={
          <Button variant="contained" color="secondary" startIcon={<AddBusiness />} onClick={handleNewBusiness} size="small">
            Novo negócio
          </Button>
        }
      >
        {activeTenants.map((tenant) => (
          <SettingRow
            key={tenant.tenantId}
            label={tenant.name}
            sublabel={tenant.role === 'Owner' ? 'Proprietário' : 'Funcionário'}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'accent.600',
                  color: 'common.white',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 1.5,
                  flexShrink: 0,
                }}
              >
                {getInitials(tenant.name)}
              </Avatar>
              {tenant.tenantId === tenantId ? (
                <Chip
                  label="Ativo"
                  size="small"
                  sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
                />
              ) : (
                <Button
                  variant="outlined"
                  size="small"
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
          </SettingRow>
        ))}
      </SettingCard>

      {/* Lojas agendadas para exclusão */}
      {inactiveTenants.length > 0 && (
        <SettingCard
          title="Encerrando"
          subtitle="Estabelecimentos agendados para exclusão. Baixe seus dados antes da data limite."
        >
          {inactiveTenants.map((tenant) => (
            <Box
              key={tenant.tenantId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 4,
                py: 2.5,
                gap: 4,
                minHeight: 56,
                bgcolor: 'error.soft',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 1.5,
                    opacity: 0.7,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(tenant.name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                    {tenant.name}
                  </Typography>
                  {tenant.scheduledDeletionAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <EventBusyOutlined sx={{ fontSize: 13, color: 'error.main' }} />
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 500 }}>
                        Exclusão em {formatDate(tenant.scheduledDeletionAt)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <ExportMenu tenant={tenant} />
            </Box>
          ))}
        </SettingCard>
      )}

      {/* Zona de risco — apenas Owner */}
      {isOwner && (
        <SettingCard
          title="Zona de risco"
          subtitle="Ações irreversíveis para o estabelecimento ativo"
          danger
        >
          <SettingRow
            label="Encerrar esta loja"
            sublabel="Agenda exclusão permanente de todos os dados em 30 dias"
          >
            <Tooltip
              title={
                !canDeactivate
                  ? 'Você precisa ter pelo menos 2 estabelecimentos ativos para encerrar um deles'
                  : ''
              }
              placement="left"
            >
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<BlockOutlined />}
                  disabled={!canDeactivate}
                  onClick={() => setDeactivateOpen(true)}
                  sx={{ minWidth: 200 }}
                >
                  Encerrar loja
                </Button>
              </span>
            </Tooltip>
          </SettingRow>
        </SettingCard>
      )}

      <ConfirmPhraseDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title="Encerrar esta loja"
        subtitle="Esta ação não pode ser desfeita."
        warningText={
          <>
            Você está prestes a encerrar <strong>permanentemente</strong> o estabelecimento{' '}
            <strong>{currentTenantName}</strong>. Os dados ficarão disponíveis para download por{' '}
            <strong>30 dias</strong> e depois serão excluídos para sempre.
          </>
        }
        confirmPhrase={`Eu quero encerrar permanentemente ${currentTenantName}`}
        confirmButtonLabel="Encerrar loja"
        confirmButtonIcon={<DeleteForeverOutlined />}
        isPending={deactivate.isPending}
        onConfirm={() => deactivate.mutate()}
      />
    </Box>
  )
}
