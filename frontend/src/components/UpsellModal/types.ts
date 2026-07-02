export interface Props {
  open: boolean
  onClose: () => void
  // Conteúdo de marketing — todos com defaults genéricos de "upgrade para o Pro".
  title?: string
  description?: string
  // Bullets de benefício exibidos com check. Default: benefícios gerais do Pro.
  highlights?: string[]
}
