import CheckIcon from '@mui/icons-material/Check'
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Switch,
  TextField
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import {
  useTenantSettings,
  useUpdateModulesSettings,
  useUpdateOperationSettings,
} from '../../../../hooks/useTenantSettings'
import { ALL_MODULES, OPERATION_MODULES, type OperationModule } from '../../../../constants/modules'
import type { OperationSettings } from '../../../../types/settings.types'




export default function OperationSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdateOperationSettings()
  const [form, setForm] = useState<OperationSettings | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setForm(data.operation)
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

  const set = (patch: Partial<OperationSettings>) =>
    setForm((f) => (f ? { ...f, ...patch } : f))

  const hasChanges = JSON.stringify(form) !== JSON.stringify(data?.operation)

  const handleSave = () => update.mutate(form)
  const handleCancel = () => data && setForm(data.operation)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Vendas e descontos"
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
        <SettingRow label="Permitir descontos no PDV">
          <Switch
            checked={form.allowDiscounts}
            onChange={(e) => set({ allowDiscounts: e.target.checked })}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Limite de desconto" sublabel="Limita o desconto maximo por venda">
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

      <ModulesCard enabledModules={data?.modules ?? ALL_MODULES} />
    </Box>
  )
}

// ─── Card de módulos da operação ─────────────────────────────────────────────

function ModulesCard({ enabledModules }: { enabledModules: OperationModule[] }) {
  const update = useUpdateModulesSettings()
  const [selected, setSelected] = useState<OperationModule[]>(enabledModules)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      setSelected(enabledModules)
      initialized.current = true
    }
  }, [enabledModules])

  const toggle = (module: OperationModule) =>
    setSelected((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    )

  const isEnabled = (module: OperationModule) => selected.includes(module)

  const hasChanges =
    [...selected].sort().join(',') !== [...enabledModules].sort().join(',')

  const handleSave = () => update.mutate(selected)
  const handleCancel = () => setSelected(enabledModules)

  return (
    <SettingCard
      title="Módulos da operação"
      subtitle="Ative apenas os módulos que sua loja usa. Os desativados somem do menu e das permissões."
      action={
        hasChanges ? (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" size="small" onClick={handleCancel} disabled={update.isPending}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
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
      {ALL_MODULES.map((module) => (
        <SettingRow
          key={module}
          label={OPERATION_MODULES[module].label}
          sublabel={OPERATION_MODULES[module].description}
        >
          <Switch
            checked={isEnabled(module)}
            onChange={() => toggle(module)}
            color="secondary"
          />
        </SettingRow>
      ))}
    </SettingCard>
  )
}
