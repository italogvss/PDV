import CheckIcon from '@mui/icons-material/Check'
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  InputAdornment,
  Switch,
  TextField
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import PremiumLock from '../../../../components/PremiumLock'
import {
  useTenantSettings,
  useUpdateModulesSettings,
  useUpdateOperationSettings,
} from '../../../../hooks/useTenantSettings'
import { ALL_MODULES, MODULE_GROUPS, type OperationModule } from '../../../../constants/modules'
import { FEATURES } from '../../../../constants/entitlements'
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

  const op = data?.operation
  const enabledModules = data?.modules ?? ALL_MODULES

  const discountChanged =
    op?.allowDiscounts !== form.allowDiscounts ||
    op?.discountLimitPercent !== form.discountLimitPercent

  const inventoryChanged =
    op?.inventoryControlEnabled !== form.inventoryControlEnabled ||
    op?.defaultMinStock !== form.defaultMinStock ||
    op?.defaultCriticalStock !== form.defaultCriticalStock ||
    op?.stockFieldsEditable !== form.stockFieldsEditable ||
    op?.requireCostPriceOnProducts !== form.requireCostPriceOnProducts ||
    op?.requireCostPriceOnServices !== form.requireCostPriceOnServices

  const customersChanged =
    op?.requireCustomerOnSale !== form.requireCustomerOnSale ||
    op?.requireCustomerOnAppointment !== form.requireCustomerOnAppointment

  const handleSave = () => update.mutate(form)

  const handleDiscountCancel = () =>
    op && setForm((f) => f ? { ...f, allowDiscounts: op.allowDiscounts, discountLimitPercent: op.discountLimitPercent } : f)

  const handleInventoryCancel = () =>
    op && setForm((f) => f ? {
      ...f,
      inventoryControlEnabled: op.inventoryControlEnabled,
      defaultMinStock: op.defaultMinStock,
      defaultCriticalStock: op.defaultCriticalStock,
      stockFieldsEditable: op.stockFieldsEditable,
      requireCostPriceOnProducts: op.requireCostPriceOnProducts,
      requireCostPriceOnServices: op.requireCostPriceOnServices,
    } : f)

  const handleCustomersCancel = () =>
    op && setForm((f) => f ? {
      ...f,
      requireCustomerOnSale: op.requireCustomerOnSale,
      requireCustomerOnAppointment: op.requireCustomerOnAppointment,
    } : f)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Vendas e descontos"
        action={
          discountChanged ? (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" size="small" onClick={handleDiscountCancel} disabled={update.isPending}>
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
<Collapse in={form.allowDiscounts} unmountOnExit>
        <SettingRow label="Limite de desconto" sublabel="Limita o desconto máximo por venda">
          <PremiumLock
            feature={FEATURES.customDiscountPercentage}
            radius={1}
            title="Descontos personalizados no Pro"
            description="Definir um limite de desconto personalizado é um recurso do plano Pro. Faça upgrade para configurá-lo."
          >
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
          </PremiumLock>
        </SettingRow>
        </Collapse>
      </SettingCard>

      <InventoryCard
        form={form}
        set={set}
        hasChanges={inventoryChanged}
        onSave={handleSave}
        onCancel={handleInventoryCancel}
        isPending={update.isPending}
      />

      <CustomersCard
        form={form}
        set={set}
        hasChanges={customersChanged}
        onSave={handleSave}
        onCancel={handleCustomersCancel}
        isPending={update.isPending}
        enabledModules={enabledModules}
      />

      <ModulesCard enabledModules={data?.modules ?? ALL_MODULES} />
    </Box>
  )
}

// ─── Card de controle de estoque ─────────────────────────────────────────────

interface InventoryCardProps {
  form: OperationSettings
  set: (patch: Partial<OperationSettings>) => void
  hasChanges: boolean
  onSave: () => void
  onCancel: () => void
  isPending: boolean
}

function InventoryCard({ form, set, hasChanges, onSave, onCancel, isPending }: InventoryCardProps) {
  return (
    <SettingCard
      title="Estoque"
      subtitle="Defina valores padrões e regras de edição para os campos de estoque mínimo e crítico."
      action={
        hasChanges ? (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" size="small" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
              onClick={onSave}
              disabled={isPending}
            >
              Salvar alterações
            </Button>
          </Box>
        ) : undefined
      }
    >
      <PremiumLock
        feature={FEATURES.advancedInventory}
        title="Controle de estoque no Pro"
        description="Configurar estoque mínimo, crítico e regras de preço de custo é um recurso do plano Pro. Faça upgrade para habilitar estas regras."
      >
        <Box>
          <SettingRow
            label="Controlar estoque mínimo e crítico"
            sublabel="Ativa valores padrões e regras de edição nos campos de estoque dos produtos"
          >
            <Switch
              checked={form.inventoryControlEnabled}
              onChange={(e) => set({ inventoryControlEnabled: e.target.checked })}
              color="secondary"
            />
          </SettingRow>

          <Collapse in={form.inventoryControlEnabled} unmountOnExit>
            <Divider />
            <SettingRow
              label="Estoque mínimo padrão"
              sublabel="Pré-preenchido ao cadastrar um novo produto"
            >
              <TextField
                size="small"
                type="number"
                value={form.defaultMinStock}
                onChange={(e) => set({ defaultMinStock: Number(e.target.value) || 0 })}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </SettingRow>
            <Divider />
            <SettingRow
              label="Estoque crítico padrão"
              sublabel="Pré-preenchido ao cadastrar um novo produto"
            >
              <TextField
                size="small"
                type="number"
                value={form.defaultCriticalStock}
                onChange={(e) => set({ defaultCriticalStock: Number(e.target.value) || 0 })}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </SettingRow>
            <Divider />
            <SettingRow
              label="Campos editáveis no cadastro e edição"
              sublabel="Permite alterar estoque mínimo e crítico ao cadastrar ou editar produtos"
            >
              <Switch
                checked={form.stockFieldsEditable}
                onChange={(e) => set({ stockFieldsEditable: e.target.checked })}
                color="secondary"
              />
            </SettingRow>
          </Collapse>

          <Divider />
          <SettingRow
            label="Exigir preço de custo em produtos"
            sublabel="Produtos sem preço de custo não são considerados nos cálculos de lucro dos relatórios"
          >
            <Switch
              checked={form.requireCostPriceOnProducts}
              onChange={(e) => set({ requireCostPriceOnProducts: e.target.checked })}
              color="secondary"
            />
          </SettingRow>
          <Divider />
          <SettingRow
            label="Exigir preço de custo em serviços"
            sublabel="Serviços sem preço de custo não são considerados nos cálculos de lucro dos relatórios"
          >
            <Switch
              checked={form.requireCostPriceOnServices}
              onChange={(e) => set({ requireCostPriceOnServices: e.target.checked })}
              color="secondary"
            />
          </SettingRow>
        </Box>
      </PremiumLock>
    </SettingCard>
  )
}

// ─── Card de clientes ─────────────────────────────────────────────────────────

interface CustomersCardProps {
  form: OperationSettings
  set: (patch: Partial<OperationSettings>) => void
  hasChanges: boolean
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  enabledModules: OperationModule[]
}

function CustomersCard({ form, set, hasChanges, onSave, onCancel, isPending, enabledModules }: CustomersCardProps) {
  const hasSales = enabledModules.includes('sales')
  const hasScheduling = enabledModules.includes('services') || enabledModules.includes('appointments')

  if (!hasSales && !hasScheduling) return null

  return (
    <SettingCard
      title="Clientes"
      subtitle="Defina se é obrigatório vincular um cliente nas operações abaixo."
      action={
        hasChanges ? (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" size="small" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
              onClick={onSave}
              disabled={isPending}
            >
              Salvar alterações
            </Button>
          </Box>
        ) : undefined
      }
    >
      <PremiumLock
        feature={FEATURES.customerSettings}
        title="Configurações de cliente no Pro"
        description="Exigir cliente nas operações é um recurso do plano Pro. Faça upgrade para habilitar estas regras."
      >
        {hasSales && (
          <SettingRow
            label="Obrigar cliente em nova venda"
            sublabel="Impede finalizar uma venda sem informar um cliente cadastrado"
          >
            <Switch
              checked={form.requireCustomerOnSale}
              onChange={(e) => set({ requireCustomerOnSale: e.target.checked })}
              color="secondary"
            />
          </SettingRow>
        )}
        {hasScheduling && (
          <SettingRow
            label="Obrigar cliente em novo agendamento"
            sublabel="Impede criar um agendamento sem informar um cliente cadastrado"
          >
            <Switch
              checked={form.requireCustomerOnAppointment}
              onChange={(e) => set({ requireCustomerOnAppointment: e.target.checked })}
              color="secondary"
            />
          </SettingRow>
        )}
      </PremiumLock>
    </SettingCard>
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
