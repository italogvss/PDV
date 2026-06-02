export interface SelectedCustomer {
  id: string
  name: string
  document: string | null
}

export interface SelectCustomerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (customer: SelectedCustomer) => void
}
