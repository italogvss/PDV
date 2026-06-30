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

export function clearStoredPlanSlug(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
