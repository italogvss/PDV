// Espelho leve do EntitlementCatalog do backend (chaves de FEATURE) e do PlanLimits (chaves de
// LIMITE). Fonte de verdade é o backend; aqui só as chaves usadas pela UI para gating/upsell.
// Convenção do projeto: o plano NÃO esconde UI — para features com endpoint, deixe o 402 barrar;
// para features sem endpoint (ex.: painel analítico), mostre cadeado/CTA usando `has(key)`.

export const FEATURES = {
  advancedDashboard: 'advancedDashboard',
  productWithPhoto: 'productWithPhoto',
  productLinkedToService: 'productLinkedToService',
  recurringExpense: 'recurringExpense',
  customRoles: 'customRoles',
  advancedReports: 'advancedReports',
  informativeCustomerData: 'informativeCustomerData',
  customerSettings: 'customerSettings',
  customDiscountPercentage: 'customDiscountPercentage',
  notifications: 'notifications',
  advancedInventory: 'advancedInventory',
  advancedEmployee: 'advancedEmployee',
  advancedExpanses: 'advancedExpanses',
} as const

export type PlanFeature = (typeof FEATURES)[keyof typeof FEATURES]

// Rótulos PT-BR das features — usados na Assinatura (recursos inclusos / upsell de upgrade).
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  advancedDashboard: 'Painel analítico com métricas e gráficos',
  productWithPhoto: 'Fotos nos produtos',
  productLinkedToService: 'Produtos vinculados a serviços',
  recurringExpense: 'Despesas recorrentes automáticas',
  customRoles: 'Cargos e permissões personalizados',
  advancedReports: 'Relatórios avançados',
  informativeCustomerData: 'Dados completos de clientes',
  customerSettings: 'Configurações avançadas de cliente',
  customDiscountPercentage: 'Desconto personalizado por percentual',
  notifications: 'Notificações',
  advancedInventory: 'Alertas de estoque mínimo e crítico',
  advancedEmployee: 'Gestão avançada de equipe',
  advancedExpanses: 'Despesas avançadas',
}

export const PLAN_LIMITS = {
  employees: 'employees',
  stores: 'stores',
  saleHistoryDays: 'saleHistoryDays',
  auditDays: 'auditDays',
} as const

export type PlanLimitKey = (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS]

export const UNLIMITED = -1
