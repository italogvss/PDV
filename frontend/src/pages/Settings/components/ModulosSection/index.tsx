import CheckIcon from '@mui/icons-material/Check'
import { Box, Button, CircularProgress, Switch } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import { useTenantSettings, useUpdateModulesSettings } from '../../../../hooks/useTenantSettings'
import { ALL_MODULES, MODULE_GROUPS, type OperationModule } from '../../../../constants/modules'

export default function ModulosSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdateModulesSettings()
  const enabledModules = data?.modules ?? ALL_MODULES
  const [selected, setSelected] = useState<OperationModule[]>(enabledModules)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setSelected(data.modules ?? ALL_MODULES)
      initialized.current = true
    }
  }, [data])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const isGroupEnabled = (groupModules: OperationModule[]) =>
    groupModules.every((m) => selected.includes(m))

  const toggleGroup = (groupModules: OperationModule[]) =>
    setSelected((prev) => {
      const allEnabled = groupModules.every((m) => prev.includes(m))
      if (allEnabled) return prev.filter((m) => !groupModules.includes(m))
      const missing = groupModules.filter((m) => !prev.includes(m))
      return [...prev, ...missing]
    })

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
      {MODULE_GROUPS.map((group) => (
        <SettingRow
          key={group.label}
          label={group.label}
          sublabel={group.description}
        >
          <Switch
            checked={isGroupEnabled(group.modules)}
            onChange={() => toggleGroup(group.modules)}
            color="secondary"
          />
        </SettingRow>
      ))}
    </SettingCard>
  )
}
