export interface SaleDetailModalProps {
  saleId: string | null
  onClose: () => void
  onCancel: (id: string) => void
}
