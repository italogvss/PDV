import type { AuditAction, AuditEntityType, StockMovementType } from '../../types/audit.types'
import type { FilterTabOption } from '../../components/FilterTabs/types'

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'

export const ACTION_LABEL: Record<AuditAction, string> = {
  ProductPriceChanged: 'Preço de produto',
  ServicePriceChanged: 'Preço de serviço',
  StockMovement: 'Movimentação de estoque',
  AppointmentStatusChanged: 'Status de agendamento',
  ProductDeactivated: 'Produto desativado',
  ServiceDeactivated: 'Serviço desativado',
  CustomerDeactivated: 'Cliente desativado',
  EmployeeDeactivated: 'Funcionário desativado',
  RolePermissionsChanged: 'Permissões de cargo',
}

export const ACTION_COLOR: Record<AuditAction, ChipColor> = {
  ProductPriceChanged: 'info',
  ServicePriceChanged: 'info',
  StockMovement: 'primary',
  AppointmentStatusChanged: 'secondary',
  ProductDeactivated: 'error',
  ServiceDeactivated: 'error',
  CustomerDeactivated: 'error',
  EmployeeDeactivated: 'error',
  RolePermissionsChanged: 'warning',
}

export const ENTITY_TYPE_LABEL: Record<AuditEntityType, string> = {
  Product: 'Produto',
  Service: 'Serviço',
  Customer: 'Cliente',
  Employee: 'Funcionário',
  Appointment: 'Agendamento',
  TenantRole: 'Cargo',
}

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  Purchase: 'Entrada',
  Sale: 'Saída (Venda)',
  SaleCancel: 'Estorno',
  ManualAdjust: 'Ajuste Manual',
}

// Nomes dos status de agendamento como vêm do enum do backend.
export const STATUS_LABEL: Record<string, string> = {
  Pendente: 'Pendente',
  Confirmado: 'Confirmado',
  EmAtendimento: 'Em atendimento',
  Concluido: 'Concluído',
  Cancelado: 'Cancelado',
}

// Token de cor (do tema) para cada ação na aba de filtro. Reaproveita a
// categoria semântica de ACTION_COLOR, resolvendo para o tom `.main`.
const ACTION_TAB_COLOR: Record<AuditAction, string> = Object.fromEntries(
  (Object.keys(ACTION_COLOR) as AuditAction[]).map((a) => [a, `${ACTION_COLOR[a]}.main`]),
) as Record<AuditAction, string>

/** Valor da aba "Todas" — sem filtro de ação. */
export const ALL_ACTIONS = 'all'

// Opções da FilterTabs: "Todas" (neutra) + uma aba colorida por ação.
// O `value` é a própria AuditAction, então o filtro compara direto sem o rótulo.
export const ACTION_TAB_OPTIONS: FilterTabOption[] = [
  { value: ALL_ACTIONS, label: 'Todas' },
  ...(Object.keys(ACTION_LABEL) as AuditAction[]).map((action) => ({
    value: action,
    label: ACTION_LABEL[action],
    color: ACTION_TAB_COLOR[action],
  })),
]
