export interface CategoryFormModalProps {
  open: boolean
  onClose: () => void
  category?: { id: string; name: string; color: string }
  onSave: (data: { name: string; color: string }) => Promise<void>
  isPending: boolean
}
