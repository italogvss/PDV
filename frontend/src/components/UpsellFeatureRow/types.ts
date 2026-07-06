export interface Props {
  // Texto da linha (o recurso Pro sendo anunciado).
  title: string
  description: string
  // Rótulo do chip dourado. Default: 'Pro'.
  chipLabel?: string
  ariaLabel?: string
  // Conteúdo da UpsellModal aberta ao clicar (defaults genéricos na modal).
  modalTitle?: string
  modalDescription?: string
  modalHighlights?: string[]
}
