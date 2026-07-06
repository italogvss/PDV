// Handoff do plano escolhido na landing → app. A landing manda o usuário para
// `/login?plano=<slug>`; capturamos o slug no bootstrap e guardamos em sessionStorage para
// sobreviver ao login (Google/local) e à navegação até `/criar-negocio`, onde ele é enviado
// na criação do tenant para iniciar o trial PDV-side de 30 dias.
const STORAGE_KEY = 'pdv.planSlug'

// Lê `?plano=` (fallback `?plan=`) da URL atual e persiste. Remove o parâmetro da URL para não
// reprocessar nem deixá-lo visível. Chamado uma vez no bootstrap do app.
export function capturePlanSlugFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('plano') ?? params.get('plan')
  if (!slug) return

  sessionStorage.setItem(STORAGE_KEY, slug.trim().toLowerCase())

  params.delete('plano')
  params.delete('plan')
  const query = params.toString()
  const url = window.location.pathname + (query ? `?${query}` : '') + window.location.hash
  window.history.replaceState(null, '', url)
}

export function getStoredPlanSlug(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

// Grava o slug escolhido na tela `/planos` (pós-login, sem vir da landing) — mesmo storage que
// `capturePlanSlugFromUrl`, pra `useCreateTenant` consumir sem precisar saber a origem do slug.
export function setStoredPlanSlug(slug: string): void {
  sessionStorage.setItem(STORAGE_KEY, slug.trim().toLowerCase())
}

export function clearStoredPlanSlug(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

// Rota pós-login/pós-bootstrap de um usuário autenticado: já tem tenant → dashboard; sem tenant
// mas com slug capturado (veio da landing) → direto pro onboarding; sem slug nenhum → tela de
// planos, pra escolher antes de seguir (nunca visto ou já usou o trial).
export function resolvePostLoginPath(tenantId: string | null): string {
  if (tenantId) return '/'
  return getStoredPlanSlug() ? '/criar-negocio' : '/planos'
}
