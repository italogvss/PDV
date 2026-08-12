import type { CreditInstallment } from '../../../../types/credit.types'

export interface Props {
  installment: CreditInstallment | null
  onClose: () => void
}
