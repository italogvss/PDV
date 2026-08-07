import { useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Divider, Paper, Switch, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import PremiumLock from '../../../../components/PremiumLock'
import { FEATURES } from '../../../../constants/entitlements'
import {
  useUpdateNotificationSettings,
  useUserSettings,
} from '../../../../hooks/useUserSettings'
import type { NotificationPrefs } from '../../../../types/usersettings.type'
import type { OperationModule } from '../../../../constants/modules'
import { useAppSelector } from '../../../../store'

// Cada switch corresponde ao campo `IsPreferenceEnabled` de um grupo de regras do motor
// (backend: NotificationRules.All). O sublabel precisa descrever o que realmente é gerado.
const EVENTS: { key: keyof NotificationPrefs; label: string; sublabel: string; module: OperationModule }[] = [
  { key: 'stockAlerts', label: 'Alertas de estoque', sublabel: 'Produtos sem estoque, em nível crítico, baixo ou negativo', module: 'inventory' },
  { key: 'invoices', label: 'Alertas de despesas', sublabel: 'Despesas vencidas e vencendo hoje', module: 'expenses' },
  { key: 'appointments', label: 'Agendamentos', sublabel: 'Agendamentos marcados para hoje', module: 'appointments' },
]

export default function NotificationsSection() {
  const { data, isLoading } = useUserSettings()
  const update = useUpdateNotificationSettings()
  const [draft, setDraft] = useState<NotificationPrefs | null>(null)
  const modules = useAppSelector((s) => s.auth.modules)

  const visibleEvents = EVENTS.filter((e) => modules.includes(e.module))

  // O servidor manda enquanto não há edição pendente. Antes o form inicializava uma única vez
  // e nunca mais refletia o servidor (refetch, outra aba, outro dispositivo).
  useEffect(() => {
    setDraft(null)
  }, [data])

  const form = draft ?? data?.notifications ?? null

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const toggle = (key: keyof NotificationPrefs) =>
    setDraft({ ...form, [key]: !form[key] })

  // Compara TODAS as chaves, não só as visíveis: o save envia o objeto inteiro, então uma
  // divergência num módulo desativado precisa aparecer como alteração pendente.
  const hasChanges =
    !!data && (Object.keys(form) as (keyof NotificationPrefs)[]).some(
      (key) => form[key] !== data.notifications[key],
    )

  const handleSave = () => update.mutate(form)

  const handleCancel = () => setDraft(null)

  return (
    <PremiumLock
      feature={FEATURES.notifications}
      title="Desbloqueie as notificações"
      description="Receba alertas de estoque, despesas e agendamentos direto no app fazendo upgrade do seu plano."
      radius={3}
    >
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
              Preferências de notificação
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Escolha como deseja ser notificado em cada situação
            </Typography>
          </Box>
          {hasChanges && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" size="small" onClick={handleCancel} disabled={update.isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                size="small"
                color="secondary"
                startIcon={update.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                onClick={handleSave}
                disabled={update.isPending}
              >
                Salvar alterações
              </Button>
            </Box>
          )}
        </Box>
        <Divider />

        {/* Table header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px',
            px: 4,
            py: 1.5,
            bgcolor: 'surface.sunken',
            borderBottom: 1,
            borderColor: 'border.subtle',
          }}
        >
          <Typography variant="overline" sx={{ fontSize: 11, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.06em' }}>
            EVENTO
          </Typography>
          <Typography
            variant="overline"
            sx={{ fontSize: 11, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.06em', textAlign: 'center' }}
          >
            NO APP
          </Typography>
        </Box>

        {visibleEvents.map((event, idx) => (
          <Box key={event.key}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px',
                alignItems: 'center',
                px: 4,
                py: 2.5,
              }}
            >
              <Box>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {event.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {event.sublabel}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Switch
                  checked={form[event.key]}
                  onChange={() => toggle(event.key)}
                  color="secondary"
                />
              </Box>
            </Box>
            {idx < visibleEvents.length - 1 && <Divider />}
          </Box>
        ))}
      </Paper>
    </PremiumLock>
  )
}
