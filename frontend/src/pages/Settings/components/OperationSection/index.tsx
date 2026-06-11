import {
  Box,
  CircularProgress,
  InputAdornment,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import { useTenantSettings, useUpdateOperationSettings } from '../../../../hooks/useTenantSettings'
import type { OperationSettings } from '../../../../types/settings.types'

interface Shortcut {
  label: string
  keys: string[]
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Nova venda', keys: ['F2'] },
  { label: 'Buscar produto', keys: ['F3'] },
  { label: 'Aplicar desconto', keys: ['F6'] },
  { label: 'Finalizar venda', keys: ['F8'] },
  { label: 'Cancelar item', keys: ['Del'] },
  { label: 'Pagamento Pix', keys: ['⌘', 'P'] },
  { label: 'Pagamento Crédito', keys: ['⌘', 'C'] },
  { label: 'Imprimir cupom', keys: ['⌘', 'I'] },
]

function KeyChip({ label }: { label: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'surface.raised',
        border: 1,
        borderColor: 'border.subtle',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 500,
        color: 'text.secondary',
        minWidth: 28,
        textAlign: 'center',
        lineHeight: '20px',
      }}
    >
      {label}
    </Box>
  )
}

export default function OperationSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdateOperationSettings()
  const [form, setForm] = useState<OperationSettings | null>(null)

  useEffect(() => {
    if (data) setForm(data.operation)
  }, [data])

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const set = (patch: Partial<OperationSettings>) =>
    setForm((f) => (f ? { ...f, ...patch } : f))

  const hasChanges = JSON.stringify(form) !== JSON.stringify(data?.operation)

  const handleSave = () => update.mutate(form)
  const handleCancel = () => data && setForm(data.operation)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Vendas e descontos">
        <SettingRow label="Permitir descontos no PDV">
          <Switch
            checked={form.allowDiscounts}
            onChange={(e) => set({ allowDiscounts: e.target.checked })}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Limite de desconto sem gerente" sublabel="Acima disso pede liberação">
          <TextField
            size="small"
            type="number"
            value={form.discountLimitPercent}
            onChange={(e) => set({ discountLimitPercent: Number(e.target.value) || 0 })}
            sx={{ width: 100 }}
            disabled={!form.allowDiscounts}
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            }}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Atalhos de teclado" subtitle="Personalize as combinações no PDV">
        {SHORTCUTS.map((shortcut) => (
          <Box
            key={shortcut.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2,
            }}
          >
            <Typography variant="body2" color="text.primary">
              {shortcut.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {shortcut.keys.map((key) => (
                <KeyChip key={key} label={key} />
              ))}
            </Box>
          </Box>
        ))}
      </SettingCard>
    </Box>
  )
}
