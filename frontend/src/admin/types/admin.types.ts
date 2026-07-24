// Tipos da área de admin — espelham os DTOs do backend (PDV.Application/DTOs/Admin/AdminDtos.cs).
// O ASP.NET serializa em camelCase por padrão.

export interface AdminPlanDistribution {
  planName: string
  activeCount: number
}

export interface AdminRevenuePoint {
  month: string // "yyyy-MM"
  revenueCents: number
}

export interface AdminOverview {
  mrrCents: number
  arrCents: number
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  expiredSubscriptions: number
  pastDueSubscriptions: number
  monthRevenueCents: number
  monthRefundedCents: number
  failedPaymentsCount: number
  totalTenants: number
  totalUsers: number
  accountsInDeletion: number
  webhookFailures24h: number
  activePlansMissingGateway: number
  planDistribution: AdminPlanDistribution[]
  revenueByMonth: AdminRevenuePoint[]
}

export interface AdminSubscription {
  id: string
  userEmail: string
  userName: string
  planName: string
  status: string
  method: string
  provider: string
  isRenewable: boolean
  gatewaySubscriptionId: string | null
  gatewayCustomerId: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  createdAt: string
}

export interface AdminPayment {
  id: string
  userEmail: string
  userName: string
  gatewayChargeId: string
  kind: string
  method: string
  amountCents: number
  status: string
  provider: string
  couponCode: string | null
  paidAt: string | null
  periodStart: string | null
  periodEnd: string | null
  receiptUrl: string | null
  createdAt: string
}

export interface AdminPlan {
  id: string
  name: string
  description: string | null
  priceCents: number
  billingPeriod: string
  isActive: boolean
  externalProductId: string
  modules: string[]
  limits: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface AdminWebhookEvent {
  id: string
  provider: string
  eventId: string
  eventType: string
  status: string
  receivedAt: string
  processedAt: string | null
  error: string | null
}

export interface AdminConfig {
  apiKey: string
  webhookSecret: string
  provider: string
  configuredPriceCount: number
}

export interface AdminPaginated<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface UpdatePlanPayload {
  name: string
  description: string | null
  priceCents: number
}

// ── Cupons ────────────────────────────────────────────────────────────────────────────────────
// Sem entidade local: o Stripe é a fonte da verdade (Coupon + Promotion Code).

export interface AdminCoupon {
  promotionCodeId: string
  couponId: string
  code: string
  name: string | null
  percentOff: number | null
  amountOffCents: number | null
  duration: string // 'once' | 'repeating' | 'forever'
  durationInMonths: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  expiresAt: string | null
  active: boolean
  createdAt: string
}

export interface CreateCouponPayload {
  code: string
  name: string | null
  percentOff: number | null
  amountOffCents: number | null
  duration: string
  durationInMonths: number | null
  maxRedemptions: number | null
  expiresAt: string | null
}

// ── Fase 3: Suporte & Conteúdo ────────────────────────────────────────────────────────────────

export interface AdminContactMessage {
  id: string
  tenantId: string
  userId: string
  senderName: string
  senderEmail: string
  category: string
  subject: string
  body: string
  status: string
  expectedBehavior: string | null
  reproducibility: string | null
  pageContext: string | null
  appVersion: string | null
  browser: string | null
  screenResolution: string | null
  platform: string | null
  createdAt: string
}

export interface AdminAnnouncement {
  id: string
  title: string
  body: string
  type: string
  imageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  publishAt: string | null
  expiresAt: string | null
  targetPlanCode: string | null
  targetRole: string | null
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AnnouncementPayload {
  title: string
  body: string
  type: string
  imageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  publishAt: string | null
  expiresAt: string | null
  targetPlanCode: string | null
  targetRole: string | null
  priority: number
  isActive: boolean
}

// ── Conteúdo Legal ────────────────────────────────────────────────────────────────────────────

export interface AdminLegalDocument {
  id: string
  type: string // "TermsOfUse" | "PrivacyPolicy"
  content: string
  updatedAt: string
}

// ── Fase 4: Observabilidade ───────────────────────────────────────────────────────────────────

export interface AdminSystemLog {
  id: string
  level: string
  message: string
  exception: string | null
  sourceContext: string | null
  requestPath: string | null
  createdAt: string
}

export interface AdminHealthEntry {
  name: string
  status: string // Healthy | Degraded | Unhealthy
  description: string | null
  durationMs: number
}

export interface AdminHealth {
  status: string
  totalDurationMs: number
  entries: AdminHealthEntry[]
}

export interface AdminPlatformEvent {
  id: string
  source: string // Access | Webhook | Audit
  event: string
  actor: string
  detail: string | null
  occurredAt: string
}

// ── Conformidade / LGPD ───────────────────────────────────────────────────────────────────────

export interface AdminAccountDeletion {
  id: string
  userId: string
  userEmail: string
  scope: string // Account | SingleStore
  tenantId: string | null
  path: string // DeleteNow | AtPeriodEnd
  status: string // Requested | Cancelled | Effected | Purged
  requestedAt: string
  carencyStartsAt: string
  scheduledDeletionAt: string
  effectedAt: string | null
  purgeAfter: string | null
  subscriptionCanceled: boolean
  refundRequested: boolean
}

export interface AdminRetentionTenant {
  id: string
  fantasyName: string
  ownerEmail: string
  isActive: boolean
  scheduledDeletionAt: string | null
  legalHoldUntil: string | null
  createdAt: string
}

export interface AdminAccessLog {
  id: string
  userId: string
  userEmail: string
  event: string // LoggedIn | LoggedOut
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
