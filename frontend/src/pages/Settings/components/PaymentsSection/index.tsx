import CheckIcon from '@mui/icons-material/Check'
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  InputAdornment,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import {
  useTenantSettings,
  useUpdatePaymentsSettings,
} from '../../../../hooks/useTenantSettings'
import type { PaymentMethodConfig, PaymentsSettings } from '../../../../types/settings.types'
import FieldLabel from '../../../../components/FieldLabel'

const PAYMENT_METHODS: Array<{
  key: keyof Omit<PaymentsSettings, 'feesEnabled'>
  label: string
}> = [
  { key: 'cardCredit', label: 'Cartão de Crédito' },
  { key: 'cardDebit', label: 'Cartão de Débito' },
  { key: 'pix', label: 'Pix' },
  { key: 'cash', label: 'Dinheiro' },
]

export default function PaymentsSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdatePaymentsSettings()
  const [form, setForm] = useState<PaymentsSettings | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setForm(data.payments)
      initialized.current = true
    }
  }, [data])

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const set = (patch: Partial<PaymentsSettings>) =>
    setForm((f) => (f ? { ...f, ...patch } : f))

  const setMethod = (
    key: keyof Omit<PaymentsSettings, 'feesEnabled'>,
    patch: Partial<PaymentMethodConfig>,
  ) => setForm((f) => (f ? { ...f, [key]: { ...f[key], ...patch } } : f))

  const original = data?.payments
  const hasChanges =
    original?.feesEnabled !== form.feesEnabled ||
    PAYMENT_METHODS.some(
      ({ key }) =>
        original?.[key].enabled !== form[key].enabled ||
        original?.[key].fee !== form[key].fee,
    )

  const handleSave = () => update.mutate(form)
  const handleCancel = () =>
    original &&
    setForm({
      feesEnabled: original.feesEnabled,
      pix: { ...original.pix },
      cardCredit: { ...original.cardCredit },
      cardDebit: { ...original.cardDebit },
      cash: { ...original.cash },
    })

  return (
    <SettingCard
      title="Formas de pagamento"
      subtitle="Configure os métodos de pagamento aceitos nas vendas."
      action={
        hasChanges ? (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCancel}
              disabled={update.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={
                update.isPending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CheckIcon />
                )
              }
              onClick={handleSave}
              disabled={update.isPending}
            >
              Salvar alterações
            </Button>
          </Box>
        ) : undefined
      }
    >
      <SettingRow
        label="Cobrar taxa por venda"
        sublabel="Ativa um campo de taxa (%) por forma de pagamento"
      >
        <Switch
          checked={form.feesEnabled}
          onChange={(e) => set({ feesEnabled: e.target.checked })}
          color="secondary"
          disabled={update.isPending}
        />
      </SettingRow>

      <Box sx={{ px: 4, py: 2.5 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          Métodos disponíveis
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 2 }}>
          Selecione os métodos aceitos na finalização de venda
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {PAYMENT_METHODS.map(({ key, label }) => (
            <PaymentMethodCard
              key={key}
              label={label}
              config={form[key]}
              feesEnabled={form.feesEnabled}
              onToggle={(enabled) => setMethod(key, { enabled })}
              onFeeChange={(fee) => setMethod(key, { fee })}
              isPending={update.isPending}
            />
          ))}
        </Box>
      </Box>
    </SettingCard>
  )
}

interface PaymentMethodCardProps {
  label: string
  config: PaymentMethodConfig
  feesEnabled: boolean
  onToggle: (enabled: boolean) => void
  onFeeChange: (fee: number) => void
  isPending: boolean
}

function PaymentMethodCard({
  label,
  config,
  feesEnabled,
  onToggle,
  onFeeChange,
  isPending,
}: PaymentMethodCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 2,
        minHeight: 72,
        borderRadius: 2,
        border: '1px solid',
        borderColor: config.enabled ? 'secondary.main' : 'border.subtle',
        bgcolor: config.enabled ? 'secondary.soft' : 'transparent',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        minWidth: 140,
        flex: '1 1 140px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: config.enabled ? 600 : 500,
            color: config.enabled ? 'secondary.ink' : 'text.primary',
          }}
        >
          {label}
        </Typography>
        <Switch
          checked={config.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          color="secondary"
          disabled={isPending}
        />
      </Box>

      <Collapse in={feesEnabled && config.enabled} unmountOnExit sx={{ mt: 'auto' }}>
        <Box sx={{ pt: 1.5 }}>
          <FieldLabel label="Taxa por venda" />
          <TextField
            size="small"
            type="number"
            value={config.fee}
            onChange={(e) => onFeeChange(Number(e.target.value) || 0)}
            fullWidth
            disabled={isPending}
            slotProps={{
              htmlInput: { min: 0, max: 100, step: 0.1 },
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            }}
          />
        </Box>
      </Collapse>
    </Box>
  )
}
