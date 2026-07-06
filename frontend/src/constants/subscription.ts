// Rota única para a tela de planos/assinatura. Centraliza a string usada por todo CTA de upsell
// (UpsellButton, PremiumBanner, UpsellModal, UserMenu) — evita duplicar o caminho + query param.
export const PLANS_ROUTE = '/configuracoes?tab=assinatura'

// Tela cheia de escolha de plano pós-login (sem tenant, sem slug capturado da landing).
export const CHOOSE_PLAN_ROUTE = '/planos'
