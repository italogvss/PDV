import CheckIcon from '@mui/icons-material/Check'
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import FieldLabel from '../../../../components/FieldLabel'
import SettingCard from '../../../../components/SettingCard'
import { useToast } from '../../../../hooks/useToast'
import { useTenantSettings, useUpdatePaymentsSettings } from '../../../../hooks/useTenantSettings'
import type { PaymentMethodConfig, PaymentsSettings } from '../../../../types/settings.types'
import { MethodKey, PAYMENT_METHODS } from '../../types'



// Estado de edição: a taxa fica como string (permite digitar vírgula/decimais parciais).
interface MethodForm {
  enabled: boolean
  fee: string
}
interface FormState {
  feesEnabled: boolean
  pix: MethodForm
  cardCredit: MethodForm
  cardDebit: MethodForm
  cash: MethodForm
}

const feeToInput = (fee: number): string => (fee ? String(fee).replace('.', ',') : '')
const parseFee = (input: string): number => {
  const n = parseFloat(input.replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

function toFormState(p: PaymentsSettings): FormState {
  const m = (c: PaymentMethodConfig): MethodForm => ({ enabled: c.enabled, fee: feeToInput(c.fee) })
  return {
    feesEnabled: p.feesEnabled,
    pix: m(p.pix),
    cardCredit: m(p.cardCredit),
    cardDebit: m(p.cardDebit),
    cash: m(p.cash),
  }
}

function toPayload(f: FormState): PaymentsSettings {
  const m = (mf: MethodForm): PaymentMethodConfig => ({ enabled: mf.enabled, fee: parseFee(mf.fee) })
  return {
    feesEnabled: f.feesEnabled,
    pix: m(f.pix),
    cardCredit: m(f.cardCredit),
    cardDebit: m(f.cardDebit),
    cash: m(f.cash),
  }
}

export default function PaymentsSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdatePaymentsSettings()
  const showToast = useToast()
  const [form, setForm] = useState<FormState | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setForm(toFormState(data.payments))
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

  const toggleMethod = (key: MethodKey) =>
    setForm((f) => {
      if (!f) return f
      // Trava: deve sempre haver ao menos uma forma de pagamento habilitada.
      const isDisabling = f[key].enabled
      const enabledCount = (['pix', 'cardCredit', 'cardDebit', 'cash'] as MethodKey[]).filter((k) => f[k].enabled).length
      if (isDisabling && enabledCount <= 1) {
        showToast('É necessário manter ao menos uma forma de pagamento ativa.', 'error')
        return f
      }
      return { ...f, [key]: { ...f[key], enabled: !f[key].enabled } }
    })

  const handleFeeChange = (key: MethodKey, value: string) => {
    let normalized = value.replace(/[^\d.,]/g, '').replace('.', ',')
    const parts = normalized.split(',')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setForm((f) => (f ? { ...f, [key]: { ...f[key], fee: normalized } } : f))
  }

  const hasChanges = (() => {
    if (!form || !data) return false
    const p = data.payments
    if (form.feesEnabled !== p.feesEnabled) return true
    const changed = (mf: MethodForm, orig: PaymentMethodConfig) =>
      mf.enabled !== orig.enabled || parseFee(mf.fee) !== orig.fee
    return (
      changed(form.pix, p.pix) ||
      changed(form.cardCredit, p.cardCredit) ||
      changed(form.cardDebit, p.cardDebit) ||
      changed(form.cash, p.cash)
    )
  })()

  const handleSave = () => {
    if (!form) return
    update.mutate(toPayload(form))
  }

  const handleCancel = () => {
    if (data) setForm(toFormState(data.payments))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Métodos aceitos"
        subtitle="Aparecem como opções no fechamento da venda"
        action={
          hasChanges ? (
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
          ) : undefined
        }
      >
        <Box sx={{ px: 3, pb: 1, pt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Calcular taxas nas vendas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Registra o custo da operadora por venda (não altera o valor cobrado do cliente)
            </Typography>
          </Box>
          <Switch
            checked={form.feesEnabled}
            onChange={() => setForm((f) => (f ? { ...f, feesEnabled: !f.feesEnabled } : f))}
            color="secondary"
          />
        </Box>

        <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {PAYMENT_METHODS.map((method) => {
            const state = form[method.key]
            const enabled = state.enabled
            const Icon = method.icon
            return (
              <Box
                key={method.key}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: enabled ? 'success.soft' : 'border.subtle',
                  bgcolor: enabled ? 'success.soft' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  transition: 'all 0.15s',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleMethod(method.key)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Icon
                      sx={{
                        fontSize: 20,
                        color: enabled ? 'success.main' : 'text.tertiary',
                      }}
                    />
                    <Box>
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                        {method.label}
                      </Typography>
                      <Typography variant="caption" color={enabled ? 'success.dark' : 'text.tertiary'}>
                        {state.fee && parseFee(state.fee) > 0 ? `Taxa ${state.fee}%` : 'Sem taxa'}
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={enabled}
                    onChange={() => toggleMethod(method.key)}
                    color="secondary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>

                {enabled && method.showFees && (
                  <>
                    <FieldLabel label="Taxa por venda" />
                    <TextField
                      type="text"
                      placeholder="0,00"
                      value={state.fee}
                      disabled={!form.feesEnabled}
                      onChange={(e) => handleFeeChange(method.key, e.target.value)}
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        },
                      }}
                      sx={{ maxWidth: 100 }}
                    />
                  </>
                )}
              </Box>
            )
          })}
        </Box>
      </SettingCard>
    </Box>
  )
}
