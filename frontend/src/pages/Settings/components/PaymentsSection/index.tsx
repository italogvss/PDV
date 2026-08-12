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
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import type { CreditSettings, PaymentMethodConfig, PaymentsSettings } from '../../../../types/settings.types'
import FieldLabel from '../../../../components/FieldLabel'

// Só os métodos com taxa. Crediário fica fora: quem existe ou não é o módulo, e a taxa do
// fiado é a do método da BAIXA de cada parcela (docs/crediario.md §3).
type PaymentMethodKey = 'cardCredit' | 'cardDebit' | 'pix' | 'cash'

const PAYMENT_METHODS: Array<{ key: PaymentMethodKey; label: string }> = [
  { key: 'cardCredit', label: 'Cartão de Crédito' },
  { key: 'cardDebit', label: 'Cartão de Débito' },
  { key: 'pix', label: 'Pix' },
  { key: 'cash', label: 'Dinheiro' },
]

export default function PaymentsSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdatePaymentsSettings()
  const { isModuleEnabled } = useUserPermissions()
  const creditModuleActive = isModuleEnabled('credit')
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

  const setMethod = (key: PaymentMethodKey, patch: Partial<PaymentMethodConfig>) =>
    setForm((f) => (f ? { ...f, [key]: { ...f[key], ...patch } } : f))

  const setCredit = (patch: Partial<CreditSettings>) =>
    setForm((f) => (f ? { ...f, credit: { ...f.credit, ...patch } } : f))

  const original = data?.payments
  const hasChanges =
    original?.feesEnabled !== form.feesEnabled ||
    PAYMENT_METHODS.some(
      ({ key }) =>
        original?.[key].enabled !== form[key].enabled ||
        original?.[key].fee !== form[key].fee,
    ) ||
    original?.credit.maxInstallments !== form.credit.maxInstallments ||
    original?.credit.firstDueDays !== form.credit.firstDueDays ||
    original?.credit.minDownPaymentPercent !== form.credit.minDownPaymentPercent

  const handleSave = () => update.mutate(form)
  const handleCancel = () =>
    original &&
    setForm({
      feesEnabled: original.feesEnabled,
      pix: { ...original.pix },
      cardCredit: { ...original.cardCredit },
      cardDebit: { ...original.cardDebit },
      cash: { ...original.cash },
      credit: { ...original.credit },
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

      {/* Crediário aparece só se o módulo estiver ativo — a taxa dele não vive aqui: cada
          baixa de parcela congela a taxa do método escolhido na hora do recebimento. */}
      {creditModuleActive && (
        <Box sx={{ px: 4, py: 2.5, borderTop: 1, borderColor: 'border.subtle' }}>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
            Crediário
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 2 }}>
            Política de venda fiado aplicada na finalização de venda
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ minWidth: 160, flex: '1 1 160px' }}>
              <FieldLabel label="Máximo de parcelas" />
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.credit.maxInstallments}
                onChange={(e) => setCredit({ maxInstallments: Number(e.target.value) || 1 })}
                disabled={update.isPending}
                slotProps={{ htmlInput: { min: 1, max: 60, step: 1 } }}
              />
            </Box>
            <Box sx={{ minWidth: 160, flex: '1 1 160px' }}>
              <FieldLabel label="Prazo do 1º vencimento" />
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.credit.firstDueDays}
                onChange={(e) => setCredit({ firstDueDays: Number(e.target.value) || 0 })}
                disabled={update.isPending}
                slotProps={{
                  htmlInput: { min: 0, max: 180, step: 1 },
                  input: { endAdornment: <InputAdornment position="end">dias</InputAdornment> },
                }}
              />
            </Box>
            <Box sx={{ minWidth: 160, flex: '1 1 160px' }}>
              <FieldLabel label="Entrada mínima" />
              <TextField
                size="small"
                type="number"
                fullWidth
                value={form.credit.minDownPaymentPercent}
                onChange={(e) => setCredit({ minDownPaymentPercent: Number(e.target.value) || 0 })}
                disabled={update.isPending}
                slotProps={{
                  htmlInput: { min: 0, max: 100, step: 1 },
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                }}
              />
            </Box>
          </Box>
        </Box>
      )}
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
