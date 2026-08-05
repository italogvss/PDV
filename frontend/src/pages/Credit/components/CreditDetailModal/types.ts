import type { CreditInstallment } from '../../../../types/credit.types'

export interface Props {
  accountId: string | null
  onClose: () => void
  onReceive: (installment: CreditInstallment) => void
  onReverse: (paymentId: string) => void
  onCancelAccount: (accountId: string) => void
  /** Receber parcela (ManageCredit). */
  canManage: boolean
  /** Cancelar a conta e estornar recebimentos (CancelCredit) — ações que desfazem dinheiro. */
  canCancel: boolean
}
